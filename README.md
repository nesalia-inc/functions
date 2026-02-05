# DeesseJS Functions

![npm version](https://img.shields.io/npm/v/@deessejs/functions)
![License](https://img.shields.io/badge/license-MIT-blue)
![TypeScript](https://img.shields.io/badge/types-TypeScript-lightgrey)
![Downloads](https://img.shields.io/npm/dm/@deessejs/functions)

**DeesseJS Functions** is a powerful TypeScript library for building type-safe APIs with context management.

Following a major architectural overhaul, the library now features a simplified API that removes complex type-level programming while maintaining full type safety.

---

## Installation

You will need Node.js 16+ and npm (or another package manager) installed on your local development machine.

```bash
npm install @deessejs/functions
# or
yarn add @deessejs/functions
# or
pnpm add @deessejs/functions
```

---

## Quick Start

### Define Your First API

```typescript
import { defineContext, success } from '@deessejs/functions';
import { z } from 'zod';

// 1. Define your context (single source of truth)
const { t, createAPI } = defineContext<{
  userId: string;
  database: any;
}>({
  userId: 'user-123',
  database: myDatabase,
});

// 2. Define queries (read operations)
const getUser = t.query({
  args: z.object({
    id: z.number(),
  }),
  handler: async (ctx, args) => {
    return success({
      id: args.id,
      requestedBy: ctx.userId,
    });
  },
});

// 3. Define mutations (write operations)
const createUser = t.mutation({
  args: z.object({
    name: z.string().min(2),
    email: z.string().email(),
  }),
  handler: async (ctx, args) => {
    const user = ctx.database.users.create(args);
    return success(user);
  },
});

// 4. Create the API
const api = createAPI({ getUser, createUser });

// 5. Call your endpoints
const result = await api.getUser({ id: 123 });

if (result.ok) {
  console.log('User:', result.value);
} else {
  console.error('Error:', result.error);
}
```

---

## Why DeesseJS Functions?

- **🚀 Native API**: `query` and `mutation` are built-in - no extensions required
- **⚡ Lightning Fast**: No more "Type instantiation is excessively deep" errors
- **🎯 Simple Types**: Standard TypeScript generics - no HKT complexity
- **🔒 Type Safe**: Full end-to-end type safety with Zod validation
- **📦 Zero Config**: Get started in seconds, not hours
- **🏗️ Functional**: Pure functions and immutable data structures
- **🔄 Event-Driven**: Built-in lifecycle hooks and cache invalidation streams

---

## Core Concepts

### Context

Context is the single source of truth for your API - define it once and use it everywhere:

```typescript
const { t, createAPI } = defineContext<{
  userId: string;
  database: Database;
  logger: Logger;
}>({
  userId: 'user-123',
  database: myDatabase,
  logger: myLogger,
});
```

### Queries

Queries are read-only operations:

```typescript
const getUser = t.query({
  args: z.object({ id: z.number() }),
  handler: async (ctx, args) => {
    return success({ id: args.id, name: 'User' });
  },
});
```

### Mutations

Mutations are write operations:

```typescript
const createUser = t.mutation({
  args: z.object({ name: z.string() }),
  handler: async (ctx, args) => {
    return success({ id: 1, name: args.name });
  },
});
```

### Router

Organize endpoints logically:

```typescript
const api = createAPI({
  users: t.router({
    profile: t.router({
      get: t.query({ /* ... */ }),
      update: t.mutation({ /* ... */ }),
    }),
    settings: t.query({ /* ... */ }),
  }),
  posts: t.router({
    get: t.query({ /* ... */ }),
    list: t.query({ /* ... */ }),
  }),
});

// Usage
await api.users.profile.get({ id: 1 });
await api.users.settings.update({});
```

---

## Advanced Features

### Lifecycle Hooks

Attach middleware to your operations:

```typescript
import { query, success } from '@deessejs/functions';

const getUser = query({
  args: z.object({ id: z.number() }),
  handler: async (ctx, args) => success(args),
})
  .beforeInvoke((ctx, args) => {
    console.log(`Fetching user ${args.id}`);
  })
  .onSuccess((ctx, args, data) => {
    console.log(`User fetched: ${data.id}`);
  })
  .onError((ctx, args, error) => {
    console.error(`Failed to fetch user: ${error.message}`);
  });
```

### Outcome Type

Better failure handling with causes vs exceptions:

```typescript
import { query, cause, Causes, successOutcome, failureOutcome } from '@deessejs/functions';

const getUser = query({
  args: z.object({ id: z.number() }),
  handler: async (ctx, args) => {
    const user = await db.find(args.id);
    if (!user) {
      return failureOutcome(
        Causes.notFound(args.id, 'User')
      );
    }
    return successOutcome(user);
  },
});
```

### Retry Support

Resilient operations with automatic retries:

```typescript
import { retry, RetryConfigs } from '@deessejs/functions';

const fetchWithRetry = retry(
  async (url: string) => {
    const response = await fetch(url);
    return response.json();
  },
  RetryConfigs.network // Pre-configured retry settings
);

const data = await fetchWithRetry('https://api.example.com/data');
```

### Command Aliases

Flexible API naming for backward compatibility:

```typescript
import { query, aliases } from '@deessejs/functions';

const getUser = query({
  args: z.object({ id: z.number() }),
  handler: async (ctx, args) => success(args)
});

aliases(getUser, ['fetchUser', 'retrieveUser', 'getUserById']);

// All work the same
await api.getUser({ id: 1 });
await api.fetchUser({ id: 1 });
await api.retrieveUser({ id: 1 });
```

### Cache Invalidation Stream

Real-time cache coordination:

```typescript
import { createCacheStream } from '@deessejs/functions';

const stream = createCacheStream();

// Subscribe to cache changes
stream.subscribe('users:123', (event) => {
  if (event.type === 'invalidation') {
    // Refetch user data
    refetchUser(123);
  }
});

// Invalidate cache
stream.invalidate('users:123', {
  tags: ['users'],
  data: { reason: 'User updated' }
});
```

---

## Type Safety

Full end-to-end type safety with automatic inference:

```typescript
// TypeScript infers all types automatically
const api = createAPI({
  getUser: t.query({
    args: z.object({ id: z.number() }),
    handler: async (ctx, args) => {
      return success({
        id: args.id,        // number
        name: 'Alice',      // string
      } as const);
    },
  }),
});

// Fully typed! ✅
const result = await api.getUser({ id: 123 });
//     ^? { ok: true; value: { id: number; name: string } } | { ok: false; error: Error }
```

---

## Error Handling

```typescript
const result = await api.getUser({ id: 1 });

if (result.ok) {
  console.log('Success:', result.value);
} else {
  // Handle errors
  switch (result.error.name) {
    case 'ValidationError':
      console.error('Invalid input:', result.error.message);
      break;
    case 'NotFound':
      console.error('User not found');
      break;
    default:
      console.error('Unexpected error:', result.error.message);
  }
}
```

---

## Full Example

```typescript
import { defineContext, success } from '@deessejs/functions';
import { z } from 'zod';

// Context
interface Context {
  userId: string;
  database: {
    users: {
      find: (id: number) => Promise<any>;
      create: (data: any) => Promise<any>;
    };
  };
}

// Create API builder with context
const { t, createAPI } = defineContext<Context>({
  userId: 'user-123',
  database: myDatabase,
});

// Queries
const getUser = t.query({
  args: z.object({ id: z.number() }),
  handler: async (ctx, args) => {
    const user = await ctx.database.users.find(args.id);
    if (!user) {
      throw new Error(`User ${args.id} not found`);
    }
    return success(user);
  },
});

// Mutations
const createUser = t.mutation({
  args: z.object({
    name: z.string().min(2),
    email: z.string().email(),
  }),
  handler: async (ctx, args) => {
    const user = await ctx.database.users.create(args);
    return success({ id: user.id, ...args });
  },
});

// Create API
const api = createAPI({
  users: t.router({
    get: getUser,
    create: createUser,
  }),
});

// Use it
async function main() {
  const created = await api.users.create({
    name: 'Alice',
    email: 'alice@example.com',
  });

  if (created.ok) {
    console.log('Created user:', created.value);
  }
}
```

---

## Templates

We've built templates that include DeesseJS Functions integrations for different use cases and frameworks. You can use these templates to get started with your type-safe API.

**Available Templates:**
- **Basic** - Simple API with queries and mutations
- **Full-Stack** - Next.js integration with API routes
- **Enterprise** - Advanced features with caching and events

Check the `/examples` directory for complete working examples.

---

## Migration Guide

### From Old API (HKT-based) to New Native API

**Old API (HKT-based):**

```typescript
import { defineContext, rpc } from '@deessejs/functions';

const { t, createAPI } = defineContext<{ userId: string }>()
  .withExtensions([rpc]);

const getUser = t.query({
  args: z.object({ id: z.number() }),
  handler: async (ctx, args) => {
    return success({ id: args.id, requestedBy: ctx.userId });
  },
});

const api = createAPI({
  root: { getUser },
  runtimeContext: { userId: '123' },
});
```

**New Native API:**

```typescript
import { defineContext, success } from '@deessejs/functions';

const { t, createAPI } = defineContext<{ userId: string }>({
  userId: '123'
});

const getUser = t.query({
  args: z.object({ id: z.number() }),
  handler: async (ctx, args) => {
    return success({ id: args.id, requestedBy: ctx.userId });
  },
});

const api = createAPI({ getUser });
```

**Key Changes:**
1. ✅ Context defined ONCE in `defineContext(context)` - single source of truth
2. ✅ No `rpc` extension needed - `query` and `mutation` are built-in
3. ✅ Handler signature keeps `(ctx, args)` - context before arguments
4. ✅ `createAPI(root)` - no context parameter needed!
5. ✅ HKT-based types replaced with standard TypeScript generics
6. ✅ Faster compilation with simpler, clearer types

---

## Documentation

- **Documentation Site**: Full documentation with guides and API reference
- **Examples**: Check `/examples` directory for complete working examples
- **Type Definitions**: See JSDoc comments in your IDE for inline documentation

---

## Best Practices

### 1. Organize Your APIs

```typescript
// Create separate contexts for different domains
const userAPI = defineContext<UserContext>({ /* ... */ });
const postAPI = defineContext<PostContext>({ /* ... */ });
```

### 2. Use Composable Schemas

```typescript
const commonFields = z.object({
  id: z.number(),
  createdAt: z.date(),
});

const userSchema = commonFields.extend({
  name: z.string(),
  email: z.string().email(),
});
```

### 3. Handle Errors Gracefully

```typescript
const operation = t.mutation({
  args: z.object({ /* ... */ }),
  handler: async (ctx, args) => {
    try {
      const result = await db.create(args);
      return success(result);
    } catch (error) {
      if (error.code === 'DUPLICATE') {
        return failure(
          cause({ name: 'Conflict', message: 'User already exists' })
        );
      }
      throw error;
    }
  },
})
  .onError((ctx, args, error) => {
    // Log error for monitoring
    logger.error('Operation failed', { args, error });
  });
```

### 4. Use Aliases for Backwards Compatibility

```typescript
import { query, aliases } from '@deessejs/functions';

const v1_getUser = query({
  args: z.object({ id: z.number() }),
  handler: async (ctx, args) => success(args)
});

const v2_getUser = query({
  args: z.object({ id: z.number() }),
  handler: async (ctx, args) => success(args)
});

// Provide both
aliases(v2_getUser, ['getUser', 'fetchUser', 'getUser_v1']);
```

---

## Architectural Philosophy

DeesseJS Functions follows strict architectural principles:

- **No Classes** - Pure functions and data objects only
- **No Interfaces** - Type aliases only for structural modeling
- **Const Functions** - Arrow functions only, no `function` keyword
- **Functional Approach** - Immutability and referential clarity

---

## Community

Join the DeesseJS Functions community to ask questions, share ideas, and show your projects:

- **GitHub**: [Report issues](https://github.com/yourusername/functions/issues)
- **Discussions**: [Join the conversation](https://github.com/yourusername/functions/discussions)

---

## Contributing

Contributions to DeesseJS Functions are welcome and highly appreciated. Before you jump right into it, please review our **Contribution Guidelines** to ensure you have a smooth experience contributing.

We especially welcome:
- Bug reports
- Feature requests
- Pull requests
- Documentation improvements
- Example projects

---

## Authors

DeesseJS Functions is created and maintained by the DeesseJS team.

---

## License

MIT © DeesseJS

---

## Version History

| Version | Changes |
|---------|---------|
| **0.1.0** | 🚀 Major overhaul - Native API, simplified types, removed HKT complexity |
| **0.0.x** | Initial releases with HKT-based architecture |
