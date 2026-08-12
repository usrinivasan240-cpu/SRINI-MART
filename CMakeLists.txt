cmake_minimum_required(VERSION 3.20)
project(SriniMart
    VERSION 1.0.0
    DESCRIPTION "Enterprise Multi-Seller Marketplace Backend"
    LANGUAGES CXX
)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

find_package(Drogon REQUIRED)
find_package(libpqxx REQUIRED)
find_package(nlohmann_json REQUIRED)
find_package(spdlog REQUIRED)
find_package(GTest REQUIRED)
find_package(PkgConfig REQUIRED)
pkg_check_modules(SODIUM REQUIRED libsodium)

set(SRC_DIR ${CMAKE_SOURCE_DIR}/src)
set(TEST_DIR ${CMAKE_SOURCE_DIR}/test)

set(MODEL_HEADERS
    ${SRC_DIR}/model/User.h
    ${SRC_DIR}/model/Product.h
    ${SRC_DIR}/model/Order.h
    ${SRC_DIR}/model/OrderItem.h
    ${SRC_DIR}/model/CartItem.h
    ${SRC_DIR}/model/Review.h
    ${SRC_DIR}/model/Category.h
)

set(MODEL_SOURCES
    ${SRC_DIR}/model/User.cpp
    ${SRC_DIR}/model/Product.cpp
    ${SRC_DIR}/model/Order.cpp
    ${SRC_DIR}/model/OrderItem.cpp
    ${SRC_DIR}/model/CartItem.cpp
    ${SRC_DIR}/model/Review.cpp
    ${SRC_DIR}/model/Category.cpp
)

set(DTO_HEADERS
    ${SRC_DIR}/dto/UserDto.h
    ${SRC_DIR}/dto/ProductDto.h
    ${SRC_DIR}/dto/OrderDto.h
    ${SRC_DIR}/dto/CartDto.h
    ${SRC_DIR}/dto/ReviewDto.h
    ${SRC_DIR}/dto/AuthDto.h
    ${SRC_DIR}/dto/ResponseDto.h
)

set(DTO_SOURCES
    ${SRC_DIR}/dto/UserDto.cpp
    ${SRC_DIR}/dto/ProductDto.cpp
    ${SRC_DIR}/dto/OrderDto.cpp
    ${SRC_DIR}/dto/CartDto.cpp
    ${SRC_DIR}/dto/ReviewDto.cpp
    ${SRC_DIR}/dto/AuthDto.cpp
    ${SRC_DIR}/dto/ResponseDto.cpp
)

set(REPOSITORY_HEADERS
    ${SRC_DIR}/repository/UserRepository.h
    ${SRC_DIR}/repository/ProductRepository.h
    ${SRC_DIR}/repository/OrderRepository.h
    ${SRC_DIR}/repository/CartRepository.h
    ${SRC_DIR}/repository/ReviewRepository.h
    ${SRC_DIR}/repository/CategoryRepository.h
    ${SRC_DIR}/repository/MigrationRepository.h
)

set(REPOSITORY_SOURCES
    ${SRC_DIR}/repository/UserRepository.cpp
    ${SRC_DIR}/repository/ProductRepository.cpp
    ${SRC_DIR}/repository/OrderRepository.cpp
    ${SRC_DIR}/repository/CartRepository.cpp
    ${SRC_DIR}/repository/ReviewRepository.cpp
    ${SRC_DIR}/repository/CategoryRepository.cpp
    ${SRC_DIR}/repository/MigrationRepository.cpp
)

set(SERVICE_HEADERS
    ${SRC_DIR}/service/AuthService.h
    ${SRC_DIR}/service/ProductService.h
    ${SRC_DIR}/service/OrderService.h
    ${SRC_DIR}/service/CartService.h
    ${SRC_DIR}/service/ReviewService.h
    ${SRC_DIR}/service/AdminService.h
    ${SRC_DIR}/service/SearchService.h
    ${SRC_DIR}/service/ChatService.h
)

set(SERVICE_SOURCES
    ${SRC_DIR}/service/AuthService.cpp
    ${SRC_DIR}/service/ProductService.cpp
    ${SRC_DIR}/service/OrderService.cpp
    ${SRC_DIR}/service/CartService.cpp
    ${SRC_DIR}/service/ReviewService.cpp
    ${SRC_DIR}/service/AdminService.cpp
    ${SRC_DIR}/service/SearchService.cpp
    ${SRC_DIR}/service/ChatService.cpp
)

set(CONTROLLER_HEADERS
    ${SRC_DIR}/controller/AuthController.h
    ${SRC_DIR}/controller/ProductController.h
    ${SRC_DIR}/controller/OrderController.h
    ${SRC_DIR}/controller/CartController.h
    ${SRC_DIR}/controller/ReviewController.h
    ${SRC_DIR}/controller/AdminController.h
    ${SRC_DIR}/controller/CategoryController.h
    ${SRC_DIR}/controller/ChatController.h
    ${SRC_DIR}/controller/HealthController.h
)

set(CONTROLLER_SOURCES
    ${SRC_DIR}/controller/AuthController.cpp
    ${SRC_DIR}/controller/ProductController.cpp
    ${SRC_DIR}/controller/OrderController.cpp
    ${SRC_DIR}/controller/CartController.cpp
    ${SRC_DIR}/controller/ReviewController.cpp
    ${SRC_DIR}/controller/AdminController.cpp
    ${SRC_DIR}/controller/CategoryController.cpp
    ${SRC_DIR}/controller/ChatController.cpp
    ${SRC_DIR}/controller/HealthController.cpp
)

set(FILTER_HEADERS
    ${SRC_DIR}/filter/AuthFilter.h
    ${SRC_DIR}/filter/LoggingFilter.h
    ${SRC_DIR}/filter/RateLimitFilter.h
    ${SRC_DIR}/filter/CorsFilter.h
)

set(FILTER_SOURCES
    ${SRC_DIR}/filter/AuthFilter.cpp
    ${SRC_DIR}/filter/LoggingFilter.cpp
    ${SRC_DIR}/filter/RateLimitFilter.cpp
    ${SRC_DIR}/filter/CorsFilter.cpp
)

set(MIDDLEWARE_HEADERS
    ${SRC_DIR}/middleware/ExceptionMiddleware.h
    ${SRC_DIR}/middleware/JsonMiddleware.h
)

set(MIDDLEWARE_SOURCES
    ${SRC_DIR}/middleware/ExceptionMiddleware.cpp
    ${SRC_DIR}/middleware/JsonMiddleware.cpp
)

set(PLUGIN_HEADERS
    ${SRC_DIR}/plugin/PluginManager.h
    ${SRC_DIR}/plugin/CachePlugin.h
)

set(PLUGIN_SOURCES
    ${SRC_DIR}/plugin/PluginManager.cpp
    ${SRC_DIR}/plugin/CachePlugin.cpp
)

set(UTIL_HEADERS
    ${SRC_DIR}/util/HashUtil.h
    ${SRC_DIR}/util/JwtUtil.h
    ${SRC_DIR}/util/Logger.h
    ${SRC_DIR}/util/Config.h
    ${SRC_DIR}/util/Validator.h
    ${SRC_DIR}/util/JsonUtils.h
)

set(UTIL_SOURCES
    ${SRC_DIR}/util/HashUtil.cpp
    ${SRC_DIR}/util/JwtUtil.cpp
    ${SRC_DIR}/util/Logger.cpp
    ${SRC_DIR}/util/Config.cpp
    ${SRC_DIR}/util/Validator.cpp
    ${SRC_DIR}/util/JsonUtils.cpp
)

set(EXCEPTION_HEADERS
    ${SRC_DIR}/exception/SriniMartException.h
    ${SRC_DIR}/exception/NotFoundException.h
    ${SRC_DIR}/exception/UnauthorizedException.h
    ${SRC_DIR}/exception/ForbiddenException.h
    ${SRC_DIR}/exception/ValidationException.h
    ${SRC_DIR}/exception/DatabaseException.h
)

set(DB_HEADERS
    ${SRC_DIR}/db/DatabasePool.h
    ${SRC_DIR}/db/MigrationRunner.h
)

set(DB_SOURCES
    ${SRC_DIR}/db/DatabasePool.cpp
    ${SRC_DIR}/db/MigrationRunner.cpp
)

set(CHAT_PROVIDER_HEADERS
    ${SRC_DIR}/plugin/chat/ChatProvider.h
    ${SRC_DIR}/plugin/chat/GeminiProvider.h
    ${SRC_DIR}/plugin/chat/MockProvider.h
)

set(CHAT_PROVIDER_SOURCES
    ${SRC_DIR}/plugin/chat/GeminiProvider.cpp
    ${SRC_DIR}/plugin/chat/MockProvider.cpp
)

set(ALL_HEADERS
    ${MODEL_HEADERS}
    ${DTO_HEADERS}
    ${REPOSITORY_HEADERS}
    ${SERVICE_HEADERS}
    ${CONTROLLER_HEADERS}
    ${FILTER_HEADERS}
    ${MIDDLEWARE_HEADERS}
    ${PLUGIN_HEADERS}
    ${UTIL_HEADERS}
    ${EXCEPTION_HEADERS}
    ${DB_HEADERS}
    ${CHAT_PROVIDER_HEADERS}
)

set(ALL_SOURCES
    ${MODEL_SOURCES}
    ${DTO_SOURCES}
    ${REPOSITORY_SOURCES}
    ${SERVICE_SOURCES}
    ${CONTROLLER_SOURCES}
    ${FILTER_SOURCES}
    ${MIDDLEWARE_SOURCES}
    ${PLUGIN_SOURCES}
    ${UTIL_SOURCES}
    ${DB_SOURCES}
    ${CHAT_PROVIDER_SOURCES}
)

add_executable(${PROJECT_NAME}
    ${SRC_DIR}/main.cpp
    ${ALL_SOURCES}
)

target_include_directories(${PROJECT_NAME} PRIVATE
    ${SRC_DIR}
    ${SRC_DIR}/model
    ${SRC_DIR}/dto
    ${SRC_DIR}/repository
    ${SRC_DIR}/service
    ${SRC_DIR}/controller
    ${SRC_DIR}/filter
    ${SRC_DIR}/middleware
    ${SRC_DIR}/plugin
    ${SRC_DIR}/util
    ${SRC_DIR}/exception
    ${SRC_DIR}/db
    ${SRC_DIR}/plugin/chat
)

target_link_libraries(${PROJECT_NAME} PRIVATE
    Drogon::Drogon
    pqxx
    nlohmann_json::nlohmann_json
    spdlog::spdlog
    GTest::gtest
    ${SODIUM_LIBRARIES}
)

target_include_directories(${PROJECT_NAME} PRIVATE
    ${SODIUM_INCLUDE_DIRS}
)

target_compile_options(${PROJECT_NAME} PRIVATE
    $<$<CXX_COMPILER_ID:GNU>:-Wall -Wextra -Wpedantic -Werror -Wno-unused-parameter>
    $<$<CXX_COMPILER_ID:Clang>:-Wall -Wextra -Wpedantic -Werror -Wno-unused-parameter>
    $<$<CXX_COMPILER_ID:MSVC>:/W4 /WX>
)

target_compile_definitions(${PROJECT_NAME} PRIVATE
    $<$<CONFIG:Debug>:SRINIMART_DEBUG>
    $<$<CONFIG:Release>:SRINIMART_RELEASE>
)

enable_testing()
add_subdirectory(test)

install(TARGETS ${PROJECT_NAME}
    RUNTIME DESTINATION bin
)

install(DIRECTORY ${SRC_DIR}/schema/
    DESTINATION share/SriniMart/schema
)

install(DIRECTORY ${CMAKE_SOURCE_DIR}/migrations/
    DESTINATION share/SriniMart/migrations
)
