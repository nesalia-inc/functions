# DeesseJS Functions

![License](https://img.shields.io/badge/license-MIT-blue)
![TypeScript](https://img.shields.io/badge/types-TypeScript-lightgrey)

### Introduction

DeesseJS Functions is a collection of typed, composable utility helpers designed for building type-safe APIs with context management. Small, focused, and functional, these helpers aim to improve clarity and reusability in TypeScript projects while keeping runtime weight minimal.

### Installation

Install from npm:

```bash
npm install @deessejs/functions
# or
yarn add @deessejs/functions
# or
pnpm add @deessejs/functions
```

### Quick Start

Here's a complete example showing how to define a context, create typed queries and mutations, and execute them:

```ts
import { success, defineContext, rpc } from "@deessejs/functions";
import z from "zod";

// 1. Define your runtime context (data available to all handlers)
const runtimeContext = {
  userId: "user-123",
  database: {
    users: {
      create: (data: any) => ({ id: 1, ...data }),
    },
  },
};

// 2. Create a context builder with extensions
const { t, createAPI } = defineContext<typeof runtimeContext>()
  .withExtensions([rpc]);

// 3. Define mutations (write operations)
const createUser = t.mutation({
  args: z.object({
    name: z.string().min(2),
    email: z.string().email(),
  }),
  handler: async (ctx, args) => {
    // Access runtime context through ctx
    const user = ctx.database.users.create(args);
    return success(user);
  },
});

// 4. Define queries (read operations)
const getUser = t.query({
  args: z.object({
    id: z.number(),
  }),
  handler: async (ctx, args) => {
    // ctx has full type safety - knows about userId and database
    return success({
      id: args.id,
      requestedBy: ctx.userId,
    });
  },
});

// 5. Create the API with your runtime context
const api = createAPI({
  root: { createUser, getUser },
  runtimeContext: runtimeContext,
});

// 6. Use the API
async function main() {
  // Create a user
  const createResult = await api.createUser({
    name: "Alice",
    email: "alice@example.com",
  });

  if (createResult.ok) {
    console.log("Created user:", createResult.value);
    // Output: { id: 1, name: "Alice", email: "alice@example.com" }
  } else {
    console.error("Failed:", createResult.error);
  }

  // Get a user
  const getResult = await api.getUser({ id: 1 });

  if (getResult.ok) {
    console.log("User:", getResult.value);
    // Output: { id: 1, requestedBy: "user-123" }
  }
}

main();
```

### Key Concepts

#### **Context**

The context is the data available to all your query and mutation handlers:

```ts
const context = {
  userId: "123",
  database: myDatabase,
  logger: console.log,
};

const { t, createAPI } = defineContext<typeof context>()
  .withExtensions([rpc]);
```

#### **Queries**

Queries are read-only operations that fetch data:

```ts
const getUser = t.query({
  args: z.object({ id: z.number() }),
  handler: async (ctx, args) => {
    return success({ id: args.id, name: "User Name" });
  },
});
```

#### **Mutations**

Mutations are write operations that modify data:

```ts
const updateUser = t.mutation({
  args: z.object({ id: z.number(), name: z.string() }),
  handler: async (ctx, args) => {
    // Perform update operation
    return success({ id: args.id, name: args.name });
  },
});
```

#### **Validation**

All arguments are validated using Zod schemas:

```ts
const createUser = t.mutation({
  args: z.object({
    name: z.string().min(2),
    age: z.number().min(0).max(120),
  }),
  handler: async (ctx, args) => {
    // args is fully typed and validated
    return success(args);
  },
});
```

If validation fails, you get a detailed error:

```ts
const result = await api.createUser({ name: "A", age: 150 });
// result.ok === false
// result.error contains validation details
```

#### **Result Handling**

Operations return a result type that can be either success or failure:

```ts
const result = await api.getUser({ id: 1 });

if (result.ok) {
  // Success: result.value is available
  console.log(result.value);
} else {
  // Failure: result.error is available
  console.error(result.error);
}
```

### Advanced Usage

#### **Grouping Routes**

Organize related endpoints together:

```ts
const { t, createAPI } = defineContext(context).withExtensions([rpc]);

const getUser = t.query({
  args: z.object({ id: z.number() }),
  handler: async (ctx, args) => success({ id: args.id }),
});

const updateUser = t.mutation({
  args: z.object({ id: z.number(), name: z.string() }),
  handler: async (ctx, args) => success(args),
});

const deleteUser = t.mutation({
  args: z.object({ id: z.number() }),
  handler: async (ctx, args) => success({ deleted: true }),
});

// Group related endpoints
const api = createAPI({
  root: {
    users: {
      get: getUser,
      update: updateUser,
      delete: deleteUser,
    },
  },
  runtimeContext: context,
});

// Usage
await api.users.get({ id: 1 });
await api.users.update({ id: 1, name: "Alice" });
await api.users.delete({ id: 1 });
```

#### **Custom Extensions**

Create custom extensions to add shared functionality:

```ts
import { extension } from "@deessejs/functions";

const loggingExtension = extension({
  name: "logger",
  init: () => ({ logs: [] as string[] }),
  request: async (state: any, ctx: any) => ({
    log: (msg: string) => state.logs.push(msg),
  }),
});

const { t, createAPI } = defineContext()
  .withExtensions([rpc, loggingExtension]);

// Now handlers can access logging functionality
const createUser = t.mutation({
  args: z.object({ name: z.string() }),
  handler: async (ctx, args) => {
    ctx.log?.(`Creating user: ${args.name}`);
    return success({ id: 1, name: args.name });
  },
});
```

#### **Async Context**

Use a function to provide context asynchronously:

```ts
const { createAPI } = defineContext<{ userId: string }>()
  .withExtensions([rpc]);

const api = createAPI({
  root: { getUser },
  runtimeContext: async () => {
    // Fetch context from database or API
    const user = await fetchUser();
    return { userId: user.id };
  },
});
```

### Type Safety

The library provides full type safety throughout:

- **Context typing**: TypeScript knows exactly what's in your context
- **Argument validation**: Zod schemas ensure type-safe input
- **Result typing**: Return types are automatically inferred
- **Autocomplete**: Full IDE support for all endpoints

### Error Handling

```ts
const result = await api.getUser({ id: 1 });

if (!result.ok) {
  // Handle errors
  switch (result.error.name) {
    case "ValidatedArgsError":
      console.error("Validation failed:", result.error.message);
      break;
    default:
      console.error("Unexpected error:", result.error);
  }
}
```

### Documentation

Full documentation and API reference: [https://functions.deessejs.com](https://functions.deessejs.com)

### License

MIT
