# Contributing to Node.js MVC Framework

First off, thank you for considering contributing to this project! It's people like you that make this framework better for everyone.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing](#testing)
- [Documentation](#documentation)

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to refkinscallv@gmail.com.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples**
- **Describe the behavior you observed and what you expected**
- **Include screenshots if possible**
- **Include your environment details** (OS, Node version, etc.)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- **Use a clear and descriptive title**
- **Provide a detailed description of the suggested enhancement**
- **Explain why this enhancement would be useful**
- **List any alternative solutions you've considered**

### Your First Code Contribution

Unsure where to begin? Look for issues tagged with:

- `good first issue` - Good for newcomers
- `help wanted` - Extra attention needed
- `beginner` - Easy fixes

## Development Setup

1. **Fork the repository**

```bash
git clone https://github.com/YOUR_USERNAME/node-framework.git
cd node-framework
```

2. **Install dependencies**

```bash
npm install
```

3. **Create a branch**

```bash
git checkout -b feature/your-feature-name
```

4. **Make your changes**

5. **Run tests**

```bash
npm test
```

6. **Run linter**

```bash
npm run lint
```

## Coding Standards

### JavaScript Style Guide

We use ESLint and Prettier for code formatting. Please ensure your code follows these standards:

- Use ES6+ features where appropriate
- Use `const` for constants, `let` for variables, never `var`
- Use arrow functions for callbacks
- Use template literals for string concatenation
- Add JSDoc comments for functions and classes
- Keep functions small and focused
- Use meaningful variable names

Example:

```javascript
/**
 * Calculate user's total score
 * @param {Object} user - User object
 * @param {Array} scores - Array of score objects
 * @returns {number} Total score
 */
const calculateTotalScore = (user, scores) => {
    return scores.reduce((total, score) => total + score.value, 0)
}
```

### File Structure

- Place new core modules in `core/` with `.core.js` suffix
- Place controllers in `app/http/controllers/` with `.controller.js` suffix
- Place models in `app/models/` with `.model.js` suffix
- Place tests in `tests/unit/` or `tests/integration/`

### Naming Conventions

- **Files**: Use kebab-case (e.g., `user-service.js`)
- **Classes**: Use PascalCase (e.g., `UserService`)
- **Functions**: Use camelCase (e.g., `getUserById`)
- **Constants**: Use UPPER_SNAKE_CASE (e.g., `MAX_RETRY_COUNT`)
- **Private methods**: Prefix with `#` (e.g., `#validateUser`)

## Commit Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that don't affect code meaning (white-space, formatting)
- **refactor**: Code change that neither fixes a bug nor adds a feature
- **perf**: Performance improvement
- **test**: Adding or correcting tests
- **chore**: Changes to build process or auxiliary tools

### Examples

```
feat(auth): add JWT refresh token support

Implement refresh token mechanism to allow users to renew their access tokens without re-authenticating.

Closes #123
```

```
fix(database): resolve connection pool leak

Fixed memory leak caused by unclosed database connections in the query builder.

Fixes #456
```

```
docs(readme): update installation instructions

Added npm and Node.js version requirements.
```

## Pull Request Process

1. **Update documentation** for any changed functionality
2. **Add tests** for new features
3. **Ensure all tests pass** (`npm test`)
4. **Run linter** (`npm run lint`)
5. **Update CHANGELOG.md** with your changes
6. **Create a Pull Request** with:
    - Clear title describing the change
    - Reference to related issues
    - Description of changes made
    - Screenshots if applicable

### PR Title Format

```
<type>(<scope>): <description>
```

Example: `feat(mailer): add HTML email template support`

### PR Review Process

- At least one maintainer review is required
- All CI checks must pass
- Code must follow project style guide
- Documentation must be updated
- Tests must be included

## Testing

### Writing Tests

- Write tests for all new features
- Maintain or improve code coverage
- Use descriptive test names
- Group related tests using `describe` blocks
- Use `beforeAll`, `afterAll`, `beforeEach`, `afterEach` for setup/teardown

Example:

```javascript
describe('UserService', () => {
    describe('createUser', () => {
        test('should create user with valid data', async () => {
            const userData = { name: 'John', email: 'john@example.com' }
            const user = await UserService.create(userData)

            expect(user).toBeDefined()
            expect(user.name).toBe('John')
        })

        test('should reject invalid email', async () => {
            const userData = { name: 'John', email: 'invalid' }

            await expect(UserService.create(userData)).rejects.toThrow('Invalid email')
        })
    })
})
```

### Running Tests

```bash
# All tests
npm test

# Watch mode
npm run test:watch

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# With coverage
npm test -- --coverage
```

## Documentation

### Code Documentation

- Add JSDoc comments for all exported functions and classes
- Explain complex logic with inline comments
- Update README.md for new features
- Update API.md for new API changes

### Documentation Style

```javascript
/**
 * Short description of what the function does
 *
 * Longer description if needed, explaining the function's
 * purpose, behavior, and any important notes.
 *
 * @param {string} param1 - Description of param1
 * @param {Object} param2 - Description of param2
 * @param {number} param2.id - Description of nested property
 * @returns {Promise<Object>} Description of return value
 * @throws {Error} When validation fails
 *
 * @example
 * const result = await functionName('value', { id: 123 })
 */
```

## Questions?

Don't hesitate to ask questions by:

- Opening an issue with the `question` label
- Emailing refkinscallv@gmail.com
- Starting a discussion in GitHub Discussions

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing!
