# Contributing to DeesseJS Functions

Thank you for your interest in contributing to DeesseJS Functions! We appreciate your help in making this project better.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)

## Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md) in all your interactions with the project.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

**Use a clear and descriptive title**
- ❌ "Bug in query"
- ✅ "Query handler fails when context contains undefined values"

**Describe the exact steps to reproduce the issue**
```typescript
// 1. Create a context with undefined value
const { t } = defineContext<{ value: string }>({
  value: undefined as any
});

// 2. Define a query
const myQuery = t.query({
  args: z.object({ id: z.number() }),
  handler: async (ctx, args) => {
    console.log(ctx.value); // This throws
  }
});

// 3. Call the query
await api.myQuery({ id: 1 });
```

**Provide expected vs actual behavior**
- Expected: Query should handle undefined context values gracefully
- Actual: Throws TypeError: Cannot read property 'toString' of undefined

**Include your environment**
- OS: [e.g. macOS 14.0, Windows 11, Ubuntu 22.04]
- Node.js version: [e.g. 20.10.0]
- Package version: [e.g. @deessejs/functions@0.0.65]
- TypeScript version: [e.g. 5.3.3]

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When suggesting an enhancement:

- Use a clear and descriptive title
- Provide a detailed explanation of the enhancement
- Explain why this enhancement would be useful
- List examples of how this feature would be used
- Include mockups or code examples if applicable

### Pull Requests

Pull requests are welcome! Here are some guidelines:

1. **Start with an issue** - For significant changes, please open an issue first to discuss
2. **Keep it focused** - Each PR should do one thing well
3. **Follow coding standards** - See [Coding Standards](#coding-standards) below
4. **Add tests** - Ensure your changes are well-tested
5. **Update documentation** - Update README, comments, and type definitions

## Development Setup

### Prerequisites

- Node.js 16 or higher
- pnpm (recommended) or npm/yarn
- Git

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
```bash
git clone https://github.com/YOUR_USERNAME/functions.git
cd functions
```

3. Add the original repository as upstream:
```bash
git remote add upstream https://github.com/nesalia-inc/functions.git
```

### Install Dependencies

```bash
pnpm install
```

### Build the Project

```bash
pnpm build
```

### Run Tests

```bash
pnpm test
```

### Run Tests in Watch Mode

```bash
pnpm test:watch
```

## Pull Request Process

### 1. Create a Branch

Create a branch for your work:
```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

### 2. Make Your Changes

- Follow the [Coding Standards](#coding-standards)
- Write tests for your changes
- Update documentation as needed

### 3. Commit Your Changes

Use clear commit messages:
```bash
# Good
git commit -m "feat: add retry decorator for queries"

# Bad
git commit -m "update stuff"
```

**Commit Message Prefixes:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `test:` - Adding or updating tests
- `refactor:` - Code refactoring
- `perf:` - Performance improvements
- `chore:` - Build process or auxiliary tool changes

### 4. Sync with Upstream

Before submitting, sync with the upstream repository:
```bash
git fetch upstream
git rebase upstream/main
```

### 5. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Then create a pull request on GitHub with:
- Clear title and description
- Reference to related issues (e.g., "Closes #123")
- Screenshots or examples if applicable

## Coding Standards

### Architectural Principles

DeesseJS Functions follows strict architectural principles that must be adhered to:

1. **No Classes** - Use pure functions and data objects only
   ```typescript
   // ❌ Bad
   class QueryHandler {
     constructor(private ctx: Context) {}
     async execute(args: Args) { }
   }

   // ✅ Good
   const executeQuery = (ctx: Context, args: Args) => { };
   ```

2. **No Interfaces** - Use type aliases only
   ```typescript
   // ❌ Bad
   interface Context {
     userId: string;
   }

   // ✅ Good
   type Context = {
     userId: string;
   };
   ```

3. **Const Functions** - Use arrow functions only
   ```typescript
   // ❌ Bad
   function handler(ctx, args) {
     return success(args);
   }

   // ✅ Good
   const handler = (ctx, args) => {
     return success(args);
   };
   ```

4. **Functional Approach** - Embrace immutability
   ```typescript
   // ❌ Bad
   const data = { items: [] };
   data.items.push newItem);

   // ✅ Good
   const data = { items: [...items, newItem] };
   ```

### TypeScript Guidelines

- Use strict type checking
- Avoid `any` types - use `unknown` when type is truly unknown
- Prefer `const` assertions for literal types
- Use JSDoc comments for public APIs

```typescript
// ✅ Good
const createUser = t.query({
  args: z.object({
    name: z.string().min(2),
    email: z.string().email(),
  }),
  handler: async (ctx, args) => {
    const user = await ctx.database.users.create(args);
    return success(user);
  },
});
```

### Code Style

- Use 2 spaces for indentation
- Use single quotes for strings
- Use semicolons
- Maximum line length: 100 characters

### Naming Conventions

- **Functions/Variables**: camelCase
- **Types/Interfaces**: PascalCase
- **Constants**: UPPER_SNAKE_CASE
- **Files**: kebab-case

```typescript
// ✅ Good
const getUserById = (id: string) => { };
type UserContext = { };
const MAX_RETRY_COUNT = 3;
// file: user-handler.ts
```

## Testing Guidelines

### Writing Tests

- Write tests for all new features
- Maintain test coverage above 80%
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)

```typescript
describe('getUser query', () => {
  it('should return user when found', async () => {
    // Arrange
    const userId = 'user-123';
    const expectedUser = { id: 1, name: 'Alice' };

    // Act
    const result = await api.getUser({ id: 1 });

    // Assert
    expect(result.ok).toBe(true);
    expect(result.value).toEqual(expectedUser);
  });

  it('should return error when user not found', async () => {
    // Arrange & Act
    const result = await api.getUser({ id: 999 });

    // Assert
    expect(result.ok).toBe(false);
    expect(result.error.name).toBe('NotFound');
  });
});
```

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run specific test file
pnpm test user-handler.test.ts
```

## Documentation

### Comments

- Use JSDoc for public APIs
- Comment complex logic
- Keep comments up to date

```typescript
/**
 * Defines a query that fetches a user by ID.
 *
 * @param args - The query arguments containing the user ID
 * @returns A promise that resolves to a success outcome containing the user
 *
 * @example
 * ```typescript
 * const getUser = t.query({
 *   args: z.object({ id: z.number() }),
 *   handler: async (ctx, args) => {
 *     const user = await db.find(args.id);
 *     return success(user);
 *   }
 * });
 * ```
 */
const getUser = t.query({
  args: z.object({ id: z.number() }),
  handler: async (ctx, args) => {
    const user = await db.find(args.id);
    return success(user);
  },
});
```

### README Updates

When adding features:
- Update the "Quick Start" section if API changes
- Add examples to "Advanced Features" if applicable
- Update "Type Safety" section if types changed

## Getting Help

If you need help:

- Check existing [issues](https://github.com/nesalia-inc/functions/issues)
- Start a [discussion](https://github.com/nesalia-inc/functions/discussions)
- Ask in the `#contributing` channel (if available)

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).

---

Thank you for contributing to DeesseJS Functions! 🚀
