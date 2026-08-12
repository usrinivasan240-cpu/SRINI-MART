# Contributing to SriniMart

Thank you for your interest in contributing to SriniMart! This document provides guidelines and information for contributors.

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on the best outcome for the project
- Show empathy towards other contributors

## Getting Started

### Prerequisites

- C++20 compiler (GCC 11+ or Clang 13+)
- CMake 3.20+
- PostgreSQL 15+
- vcpkg
- libsodium

### Development Setup

1. Fork the repository
2. Clone your fork
3. Create a feature branch: `git checkout -b feature/your-feature`
4. Set up the development environment (see README.md)
5. Make your changes
6. Run tests
7. Commit and push

## Development Guidelines

### Branch Naming

- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation changes
- `test/description` - Test additions/fixes
- `refactor/description` - Code refactoring

### Commit Messages

- Use present tense ("Add feature" not "Added feature")
- Use imperative mood ("Move cursor" not "Moves cursor")
- Keep first line under 72 characters
- Reference issues and pull requests

### Code Style

Follow the [Google C++ Style Guide](https://google.github.io/styleguide/cppguide.html) with these additions:

- Use `#pragma once` for header guards
- Namespace: `srinimart::module`
- Class names: PascalCase
- Method names: camelCase
- Member variables: camelCase with trailing underscore
- Constants: kPascalCase
- Files: PascalCase.h / PascalCase.cpp

### Architecture Rules

1. **Controllers** contain NO business logic
2. **Services** contain ALL business rules
3. **Repositories** contain ALL SQL queries
4. Use parameterized queries for ALL database operations
5. Use smart pointers, never raw new/delete
6. Follow RAII principles
7. Handle all exceptions properly

### Testing Requirements

- All new features must include unit tests
- All bug fixes must include regression tests
- Test coverage should be maintained or improved
- Run sanitizers before submitting PRs

```bash
# Run unit tests
./build/test/SriniMartTests --gtest_filter="Unit*"

# Run with sanitizers
cmake -B build-san -DCMAKE_BUILD_TYPE=Debug \
  -DSANITIZE_ADDRESS=ON -DSANITIZE_UNDEFINED=ON
cmake --build build-san
./build-san/test/SriniMartTests
```

### Pull Request Process

1. Update README.md if needed
2. Update CHANGELOG.md with your changes
3. Ensure all tests pass
4. Request review from maintainers
5. Address review feedback
6. Merge after approval

### Documentation

- Add comments for complex algorithms
- Update API documentation for new endpoints
- Update architecture docs for structural changes
- Follow the existing documentation style

## Reporting Issues

- Use GitHub Issues
- Include reproduction steps
- Include expected vs actual behavior
- Include environment details
- Include logs if applicable

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
