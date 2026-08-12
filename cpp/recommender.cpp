// ============================================================================
// File:        cpp/recommender.cpp
// Module:      C++ Recommendation Model (single process)
// Purpose:     "You may also like" product recommendations for SriniMart.
//
// ⭐ WHAT THIS FILE IS (plain English):
//   One self-contained C++ program. It reads the current product list from a
//   JSON file (products.json — a snapshot of the Firestore "products"
//   collection), scores how similar every product is to every other product
//   using a simple content-based model (same category, similar rating, similar
//   price, shared keywords), and writes the best N suggestions per product to
//   recommendations.json. It needs no server, no database connection and no
//   internet — run it and you get a ready-to-use recommendation file.
//
//   Scoring model (higher = more similar), weights are tunable at the bottom:
//     - Same category ......................... +60 points
//     - Rating similarity (0..5) .............. (5 - |ratingDiff|) * 6  -> max 30
//     - Price similarity (log scale) .......... (1 - |log10(pi/pj)|) * 10 -> max 10
//     - Shared name keywords .................. +2 each, max 10
//   A product never recommends itself. Max possible score = 110.
//
//   Where it is used:
//     - Devs/sellers run it whenever the catalogue changes to regenerate
//       recommendations.json, which the web storefront can serve from the
//       product page ("You may also like") or the chatbot can use to answer
//       "what should I buy?".
//     - It runs as a one-shot process (no background daemon), so it is safe
//       to call from CI or a scheduled job after every product update.
//
// Language:    C++17
// Dependencies: only json.hpp (single-header nlohmann/json) sits next to it.
// Build:       g++ -O2 -std=c++17 recommender.cpp -o recommender.exe
// Run:         recommender.exe products.json recommendations.json 5
// ============================================================================

#include <algorithm>
#include <cmath>
#include <cstdlib>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <map>
#include <set>
#include <string>
#include <vector>

#include "json.hpp"

using json = nlohmann::json;

// ----------------------------------------------------------------------------
// One product as the model sees it. Everything we need for scoring.
// ----------------------------------------------------------------------------
struct Product {
    std::string id;
    std::string name;
    std::string category;
    double price = 0.0;
    double rating = 0.0;
    long ratingCount = 0;
};

// ----------------------------------------------------------------------------
// A recommendation result: the suggested product plus its similarity score.
// ----------------------------------------------------------------------------
struct Rec {
    std::string id;
    std::string name;
    double price = 0.0;
    double rating = 0.0;
    double score = 0.0;
};

// ----------------------------------------------------------------------------
// Tunable model weights (the "parameters" of the model).
// ----------------------------------------------------------------------------
namespace weights {
    const double SAME_CATEGORY = 60.0;   // strong signal: buyers browse by category
    const double RATING_SCALE  = 6.0;    // reward products rated like this one
    const double PRICE_SCALE   = 10.0;   // reward products in a similar price band
    const double KEYWORD_HIT   = 2.0;    // reward shared words in the title
    const double KEYWORD_MAX   = 10.0;   // cap so one keyword bomb can't dominate
}

// ----------------------------------------------------------------------------
// Parse products.json into Product structs. Fails loudly with a clear message
// if the file is missing or malformed, so the caller knows what went wrong.
// ----------------------------------------------------------------------------
std::vector<Product> loadProducts(const std::string& path) {
    std::ifstream in(path);
    if (!in) {
        std::cerr << "Error: cannot open '" << path
                  << "' (run: recommender.exe products.json)\n";
        std::exit(1);
    }

    json data;
    try {
        in >> data;
    } catch (const std::exception& e) {
        std::cerr << "Error: '" << path << "' is not valid JSON: " << e.what() << "\n";
        std::exit(1);
    }

    if (!data.is_array()) {
        std::cerr << "Error: '" << path << "' must contain a JSON array of products.\n";
        std::exit(1);
    }

    std::vector<Product> products;
    for (const auto& item : data) {
        Product p;
        p.id        = item.value("id", "");
        p.name      = item.value("name", "");
        p.category  = item.value("categoryName", "");
        p.price     = item.value("price", 0.0);
        p.rating    = item.value("rating", 0.0);
        p.ratingCount = static_cast<long>(item.value("ratingCount", 0));
        if (!p.id.empty() && !p.name.empty()) products.push_back(p);
    }
    return products;
}

// ----------------------------------------------------------------------------
// Split a product name into lowercase words so we can count keyword overlaps.
// ----------------------------------------------------------------------------
std::set<std::string> keywordsOf(const std::string& name) {
    std::set<std::string> words;
    std::string current;
    for (char ch : name) {
        if (std::isalnum(static_cast<unsigned char>(ch))) {
            current += static_cast<char>(std::tolower(static_cast<unsigned char>(ch)));
        } else if (!current.empty()) {
            words.insert(current);
            current.clear();
        }
    }
    if (!current.empty()) words.insert(current);
    return words;
}

// ----------------------------------------------------------------------------
// Similarity score between two products (the "model").
// Returns a value in [0, 110]; higher means "more likely to be liked together".
// ----------------------------------------------------------------------------
double similarity(const Product& a, const Product& b) {
    double score = 0.0;

    // 1. Same category -> strong hint of "co-purchased" behaviour.
    if (!a.category.empty() && a.category == b.category) {
        score += weights::SAME_CATEGORY;
    }

    // 2. Rating similarity: 5 stars matching 5 stars gives +30, a big gap gives ~0.
    score += std::max(0.0, (5.0 - std::abs(a.rating - b.rating))) * weights::RATING_SCALE;

    // 3. Price similarity on a log scale: same price = +10, 10x price = ~0.
    if (a.price > 0.0 && b.price > 0.0) {
        const double ratio = std::abs(std::log10(a.price / b.price));
        score += std::max(0.0, 1.0 - ratio) * weights::PRICE_SCALE;
    }

    // 4. Shared keywords in the name ("Wireless" + "Bluetooth" = familiarity).
    const auto wa = keywordsOf(a.name);
    const auto wb = keywordsOf(b.name);
    double hits = 0.0;
    for (const auto& w : wa) {
        if (wb.count(w)) hits += weights::KEYWORD_HIT;
    }
    score += std::min(hits, weights::KEYWORD_MAX);

    return score;
}

// ----------------------------------------------------------------------------
// Compute the recommendations for one target product: score every other
// product, sort descending, keep the top-N, convert to output form.
// ----------------------------------------------------------------------------
std::vector<Rec> recommendFor(const Product& target,
                              const std::vector<Product>& all,
                              size_t topN) {
    std::vector<Rec> recs;
    for (const auto& other : all) {
        if (other.id == target.id) continue;   // never recommend itself
        recs.push_back({other.id, other.name, other.price, other.rating,
                        similarity(target, other)});
    }
    std::sort(recs.begin(), recs.end(),
              [](const Rec& x, const Rec& y) { return x.score > y.score; });
    if (recs.size() > topN) recs.resize(topN);
    return recs;
}

// ----------------------------------------------------------------------------
// main: the single entry point and only process of this model.
//   argv[1] = input products.json   (required)
//   argv[2] = output recommendations.json (default: recommendations.json)
//   argv[3] = how many suggestions per product (default: 5)
// ----------------------------------------------------------------------------
int main(int argc, char* argv[]) {
    const std::string inPath  = argc > 1 ? argv[1] : "products.json";
    const std::string outPath = argc > 2 ? argv[2] : "recommendations.json";
    const size_t      topN    = argc > 3 ? std::max<size_t>(1, std::stoul(argv[3])) : 5;

    std::cout << "SriniMart recommender: reading " << inPath << " ...\n";
    const auto products = loadProducts(inPath);
    if (products.empty()) {
        std::cerr << "Error: no valid products found in '" << inPath << "'.\n";
        return 1;
    }
    std::cout << "Loaded " << products.size() << " products.\n";

    // Compute recommendations for every product and collect the JSON output.
    json out = json::array();
    for (const auto& p : products) {
        const auto recs = recommendFor(p, products, topN);
        json entry;
        entry["productId"] = p.id;
        entry["name"] = p.name;
        entry["recommendations"] = json::array();
        for (const auto& r : recs) {
            entry["recommendations"].push_back({
                {"productId", r.id},
                {"name", r.name},
                {"price", r.price},
                {"rating", r.rating},
                {"score", r.score}
            });
        }
        out.push_back(entry);
    }

    // Write the results file (pretty-printed for easy reading).
    std::ofstream ofs(outPath);
    ofs << out.dump(2) << "\n";
    ofs.close();
    std::cout << "Wrote " << out.size() << " recommendation sets to " << outPath << ".\n";

    // Show one sample so a human can eyeball the output instantly.
    const auto& sample = out[0];
    std::cout << "\nSample: products like \"" << sample["name"].get<std::string>() << "\":\n";
    for (const auto& r : sample["recommendations"]) {
        std::cout << "  - " << r["name"].get<std::string>()
                  << "  (Rs " << r["price"].get<double>() << ", "
                  << r["rating"].get<double>() << " stars, score "
                  << r["score"].get<double>() << ")\n";
    }
    return 0;
}
