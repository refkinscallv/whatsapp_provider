# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## [1.0.5] - 2026-02-03

### Fixed

- **Critical**: Fixed race condition in graceful shutdown - properly await async operations
- **Critical**: Fixed database connection not closing properly - made `Database.close()` async
- **Error**: Fixed model loading to support subdirectories recursively
- **Bug**: Fixed 404 handler middleware order - now registered before error handler
- **Warning**: Improved error handling in hooks - critical errors now propagate properly
- **Warning**: Routes loading errors now throw instead of silent failure
- **Warning**: Enhanced socket loading error messages for better debugging
- **Warning**: Added null checks to `Database.getModel()` and `Database.getInstance()`
- **Warning**: Fixed server listen error handling using proper event listeners

### Security

- Added prominent security warning for JWT secret configuration
- Recommended using environment variables for sensitive data

### Documentation

- Updated API documentation for `Database.close()` async behavior
- Added breaking changes notice for async database methods

## [1.0.0] - 2026-01-04

### Added

- Initial release of Node.js MVC Framework
- Express.js integration with middleware support
- Socket.IO for real-time communication
- Sequelize ORM for database management
- JWT authentication utilities
- Email sending with template support (Mailer)
- File upload support with express-fileupload
- Winston logger with daily file rotation
- Application lifecycle hooks (before, after, shutdown)
- Graceful shutdown handling
- CORS configuration
- Cookie parser integration
- Error handler with API and web response modes
- Static file serving
- EJS view engine support
- Comprehensive test suite with Jest
- Code quality tools (ESLint, Prettier, Husky)
- Complete documentation (README.md, API.md)
- Example routes and configuration

### Features

- **Core Modules**:
    - Boot: Application bootstrapper
    - Database: Sequelize integration with auto model loading
    - Express: Express app with middleware setup
    - Logger: Winston-based logging system
    - JWT: Token generation and verification
    - Mailer: Email sending with EJS templates
    - Hooks: Lifecycle event system
    - Socket: Socket.IO integration
    - Server: HTTP/HTTPS server management
    - Runtime: Environment configuration
    - ErrorHandler: Global error handling

- **Security**:
    - JWT authentication
    - CORS protection
    - Helmet security headers (ready to use)
    - Rate limiting support (ready to use)
    - Input validation with express-validator

- **Developer Experience**:
    - Hot reload with nodemon
    - Code formatting with Prettier
    - Linting with ESLint
    - Pre-commit hooks with Husky
    - Comprehensive test coverage
    - Module aliases for clean imports

### Configuration

- Centralized configuration in `app/config.js`
- Support for environment variables
- Flexible database settings
- Customizable CORS policies
- File upload configuration
- Socket.IO options
- Mailer settings

### Documentation

- Complete README with quick start guide
- API documentation with examples
- Code comments in English
- Test examples for all core modules

### Development

- Jest testing framework
- Unit and integration tests
- Test coverage reporting
- Development and production scripts
- Database migration scripts (skeleton)

## [Unreleased]

### Planned

- Redis caching support
- Rate limiting middleware
- API versioning
- Request validation decorators
- CLI tool for scaffolding
- Database migrations and seeders
- Session management
- OAuth integration
- Admin panel
- API documentation generator

---

## Version History

- **1.0.5** (2026-02-03) - Bug fixes and stability improvements
- **1.0.0** (2026-01-04) - Initial release
