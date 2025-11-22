# API Design Plan

## Problem Statement
We need to implement `@packages/functions/src/api/index.ts` so that `@examples/basic/src/index.ts` works correctly with `api.double` being properly typed by TypeScript.

## Current Issues
- `Property 'double' does not exist on type` error (TS 2339)
- TypeScript doesn't know that queries have been registered
- Need to preserve strong typing while maintaining good DX

## Proposed Solutions

### Solution 1: Constructor-based Queries
```typescript
const api = createAPI({
  context: { user: { id: "123", email: "user@example.com" } },
  queries: [
    {
      name: "double",
      args: z.object({ number: z.number().min(0).max(100) }),
      handler: (args, ctx) => {
        ctx.user.id; //  Strongly typed
        return success(args.number * 2);
      },
    },
  ],
});

api.double({ number: 5 }); //  Properly typed
```

**Pros:**
- Strong typing for `ctx` in handlers
- Immediate query availability
- Precise query typing
- Simple DX

**Cons:**
- L **Immutability**: Cannot add queries dynamically
- L **Code Duplication**: Same queries defined multiple times
- L **Dependency Order**: Circular dependency issues
- L **Testing**: Hard to unit test individual queries
- L **Complex Configuration**: Constructor becomes too large
- L **API Discovery**: Poor IDE support
- L **Performance**: All queries created at once
- L **Error Handling**: Crashes immediately on config errors

### Solution 2: Dynamic Query Registration
```typescript
const api = createAPI({ context });
const double = api.query({
  name: "double",
  args: z.number(),
  handler: (args, ctx) => {
    ctx.user.id; //  Strongly typed
    return success(args.number * 2);
  }
});
api = { ...api, double }; // Manual type forcing
```

**Pros:**
- Flexible: Can add queries dynamically
- No code duplication
- Better testing support
- Lazy loading possible
- Good separation of concerns

**Cons:**
- L **Manual Type Management**: Need to force types manually
- L **Multi-step Process**: More verbose
- L **Type Safety**: Risk of forgetting to type force

### Solution 3: Type Assertion Cumulative
```typescript
export const createAPI = <TContext>(config: { context: TContext }) => {
  // ... implementation
  return {
    ...api,
    query,
  } as unknown as typeof api & Record<string, QueryFn<any, any, any>>;
};
```

**Pros:**
- Preserves current DX
- Simple implementation
- No breaking changes

**Cons:**
- L **Generic Typing**: `api.double` typed as `QueryFn<any, any, any>` instead of specific type
- L **Type Safety**: Uses `unknown` which bypasses type checking
- L **Precision**: Loses specific type information

## Recommended Approach

**Solution 2 (Dynamic Query Registration)** is the most practical despite requiring manual type forcing. It provides the best balance of:

- Flexibility and maintainability
- Testability
- Performance (lazy loading)
- Code reusability
- Error handling

## Implementation Steps

1. Modify `createAPI` to accept context only
2. Ensure `ctx` is properly typed in handlers
3. Allow dynamic query registration
4. Provide helper for manual type forcing
5. Add documentation and examples

## Final Decision

Go with Solution 2 with helper functions to reduce boilerplate:

```typescript
const api = createAPI({ context });
const withDouble = api.withQuery("double", {
  name: "double",
  args: z.number(),
  handler: (args, ctx) => success(args.number * 2)
});
withDouble.double({ number: 5 }); //  Typed
```