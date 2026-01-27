# DeesseJS Functions

![License](https://img.shields.io/badge/license-MIT-blue)
![TypeScript](https://img.shields.io/badge/types-TypeScript-lightgrey)

## Introduction

**DeesseJS Functions** is a powerful library for building type-safe APIs with context management. Following a major architectural overhaul, the library now features a simplified API that removes complex type-level programming while maintaining full type safety.

### What's New? 🚀

- **✨ Native API**: `query` and `mutation` are built-in - no extensions required
- **⚡ Lightning Fast**: No more "Type instantiation is excessively deep" errors
- **🎯 Simple Types**: Standard TypeScript generics - no HKT complexity
- **🔒 Type Safe**: Full end-to-end type safety with Zod validation
- **📦 Zero Config**: Get started in seconds, not hours

---

## Installation

```bash
npm install @deessejs/functions
# or
yarn add @deessejs/functions
# or
pnpm add @deessejs/functions
```

---

## Quick Start

### The New Simplified Way

```ts
import { createNativeAPI } from "@deessejs/functions";
import { success } from "@deessejs/functions";
import z from "zod";

// 1. Create your API builder
const { t, createAPI } = createNativeAPI<{
  userId: string;
  database: any;
}>();

// 2. Define queries (read operations)
const getUser = t.query({
  args: z.object({
    id: z.number(),
  }),
  handler: async (args, ctx) => {
    // Note: args comes BEFORE ctx in the new API
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
  handler: async (args, ctx) => {
    const user = ctx.database.users.create(args);
    return success(user);
  },
});

// 4. Create and use the API
const api = createAPI(
  { getUser, createUser },
  { userId: "user-123", database: myDatabase }
);

// 5. Call your endpoints
async function main() {
  const result = await api.getUser({ id: 123 });

  if (result.ok) {
    console.log("User:", result.value);
  } else {
    console.error("Error:", result.error);
  }
}
```

---

## Key Concepts

### Context

Context is the data available to all your handlers:

```ts
const { t, createAPI } = createNativeAPI<{
  userId: string;
  database: Database;
  logger: Logger;
}>();
```

### Queries

Queries are read-only operations:

```ts
const getUser = t.query({
  args: z.object({ id: z.number() }),
  handler: async (args, ctx) => {
    return success({ id: args.id, name: "User" });
  },
});
```

### Mutations

Mutations are write operations:

```ts
const createUser = t.mutation({
  args: z.object({ name: z.string() }),
  handler: async (args, ctx) => {
    return success({ id: 1, name: args.name });
  },
});
```

### Router

Organize endpoints logically:

```ts
const api = createAPI(
  {
    users: t.router({
      profile: t.router({
        get: t.query({ ... }),
        update: t.mutation({ ... }),
      }),
      settings: t.query({ ... }),
    }),
    posts: t.router({
      get: t.query({ ... }),
      list: t.query({ ... }),
    }),
  },
  context
);

// Usage
await api.users.profile.get({ id: 1 });
await api.users.settings.update({});
```

---

## Advanced Features

### Lifecycle Hooks

Attach middleware to your operations:

```ts
import { query } from "@deessejs/functions";

const getUser = query({
  args: z.object({ id: z.number() }),
  handler: async (args, ctx) => success(args),
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

```ts
import { cause, Causes, successOutcome, failureOutcome } from "@deessejs/functions";

const getUser = query({
  args: z.object({ id: z.number() }),
  handler: async (args, ctx) => {
    const user = await db.find(args.id);
    if (!user) {
      return failureOutcome(
        Causes.notFound(args.id, "User")
      );
    }
    return successOutcome(user);
  },
});
```

### Retry Support

Resilient operations with automatic retries:

```ts
import { retry, RetryConfigs } from "@deessejs/functions";

const fetchWithRetry = retry(
  async (url: string) => {
    const response = await fetch(url);
    return response.json();
  },
  RetryConfigs.network // Pre-configured retry settings
);

const data = await fetchWithRetry("https://api.example.com/data");
```

### Command Aliases

Flexible API naming:

```ts
import { aliases } from "@deessejs/functions";

const getUser = query({ /* ... */ });
aliases(getUser, ["fetchUser", "retrieveUser", "getUserById"]);

// All work the same
await api.getUser({ id: 1 });
await api.fetchUser({ id: 1 });
await api.retrieveUser({ id: 1 });
```

### Cache Invalidation Stream

Real-time cache coordination:

```ts
import { createCacheStream } from "@deessejs/functions";

const stream = createCacheStream();

// Subscribe to cache changes
stream.subscribe("users:123", (event) => {
  if (event.type === "invalidation") {
    // Refetch user data
    refetchUser(123);
  }
});

// Invalidate cache
stream.invalidate("users:123", {
  tags: ["users"],
  data: { reason: "User updated" }
});
```

---

## Migration Guide

### From Old API (HKT-based) to New API

**Old API:**

```ts
import { defineContext, rpc } from "@deessejs/functions";

const { t, createAPI } = defineContext<{ userId: string }>()
  .withExtensions([rpc]);

const getUser = t.query({
  args: z.object({ id: z.number() }),
  handler: async (ctx, args) => {  // ctx BEFORE args ❌
    return success({ id: args.id, requestedBy: ctx.userId });
  },
});

const api = createAPI({
  root: { getUser },
  runtimeContext: { userId: "123" },
});
```

**New API:**

```ts
import { createNativeAPI } from "@deessejs/functions";

const { t, createAPI } = createNativeAPI<{ userId: string }>();

const getUser = t.query({
  args: z.object({ id: z.number() }),
  handler: async (args, ctx) => {  // args BEFORE ctx ✅
    return success({ id: args.id, requestedBy: ctx.userId });
  },
});

const api = createAPI(
  { getUser },
  { userId: "123" }
);
```

**Key Changes:**
1. ✅ Use `createNativeAPI()` instead of `defineContext().withExtensions([rpc])`
2. ✅ No `rpc` extension needed - `query` and `mutation` are built-in
3. ✅ Handler signature: `(args, ctx)` instead of `(ctx, args)`
4. ✅ `createAPI(root, context)` instead of `createAPI({ root, runtimeContext })`

---

## Type Safety

Full end-to-end type safety:

```ts
// TypeScript infers all types automatically
const api = createAPI(
  {
    getUser: t.query({
      args: z.object({ id: z.number() }),
      handler: async (args, ctx) => {
        return success({
          id: args.id,        // number
          name: string,     // inferred from return
        } as const);
      },
    }),
  },
  { userId: "123" }
);

// Fully typed! ✅
const result = await api.getUser({ id: 123 });
//     ^? { id: number; name: string } | Error
```

---

## Error Handling

```ts
const result = await api.getUser({ id: 1 });

if (result.ok) {
  console.log("Success:", result.value);
} else {
  // Handle errors
  switch (result.error.name) {
    case "ValidationError":
      console.error("Invalid input:", result.error.message);
      break;
    case "NotFound":
      console.error("User not found");
      break;
    default:
      console.error("Unexpected error:", result.error.message);
  }
}
```

---

## Best Practices

### 1. Organize Your APIs

```ts
// Create separate contexts for different domains
const userAPI = createNativeAPI<UserContext>({ ... });
const postAPI = createNativeAPI<PostContext>({ ... });
```

### 2. Use Composable Schemas

```ts
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

```ts
const operation = t.mutation({
  args: z.object({ /* ... */ }),
  handler: async (args, ctx) => {
    try {
      const result = await db.create(args);
      return success(result);
    } catch (error) {
      if (error.code === "DUPLICATE") {
        return failure(
          cause({ name: "Conflict", message: "User already exists" })
        );
      }
      throw error;
    }
  },
})
  .onError((ctx, args, error) => {
    // Log error for monitoring
    logger.error("Operation failed", { args, error });
  });
```

### 4. Use Aliases for Backwards Compatibility

```ts
const v1_getUser = query({ /* old implementation */ });
const v2_getUser = query({ /* new implementation */ });

// Provide both
aliases(v2_getUser, ["getUser", "fetchUser", "getUser_v1"]);
```

---

## Full Example

```ts
import { createNativeAPI } from "@deessejs/functions";
import { success } from "@deessejs/functions";
import { z } from "zod";

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

// Create API
const { t, createAPI } = createNativeAPI<Context>();

// Queries
const getUser = t.query({
  args: z.object({ id: z.number() }),
  handler: async (args, ctx) => {
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
  handler: async (args, ctx) => {
    const user = await ctx.database.users.create(args);
    return success({ id: user.id, ...args });
  },
});

// Create runtime
const api = createAPI(
  {
    users: t.router({
      get: getUser,
      create: createUser,
    }),
  },
  {
    userId: "user-123",
    database: myDatabase,
  }
);

// Use it
async function main() {
  const created = await api.users.create({
    name: "Alice",
    email: "alice@example.com",
  });

  if (created.ok) {
    console.log("Created user:", created.value);
  }
}
```

---

## Documentation

- **Type Definitions**: See JSDoc comments in your IDE for inline documentation
- **Examples**: Check `/examples` directory for complete working examples
- **API Reference**: Full API documentation coming soon

---

## License

MIT

---

## What's Changed? (Migration from v0.0.x)

| Old (v0.0.x) | New (v0.1.0) |
|---------------|--------------|
| `defineContext().withExtensions([rpc])` | `createNativeAPI()` |
| `t.query()` from rpc extension | `t.query()` is native |
| `handler: async (ctx, args)` | `handler: async (args, ctx)` |
| `createAPI({ root, runtimeContext })` | `createAPI(root, context)` |
| HKT-based types | Standard TypeScript generics |
| Complex type errors | Simple, clear types |
| Slow compilation | Fast compilation |

Need help migrating? Check the examples directory or open an issue!
