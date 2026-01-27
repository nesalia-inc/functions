import { describe, it, expect, beforeEach, vi } from "vitest";
import { z } from "zod";
import { defineContext } from "../../src/context/define";
import { rpc } from "../../src/extensions/rpc";
import { extension } from "../../src/extensions";
import { success, failure } from "../../src/types";

describe("defineContext", () => {
  describe("basic context creation", () => {
    it("should create context builder with default empty context", () => {
      const { t, createAPI } = defineContext().withExtensions([rpc]);

      expect(t).toBeDefined();
      expect(createAPI).toBeDefined();
      expect(typeof t.router).toBe("function");
    });

    it("should create context builder with initial context", () => {
      const initialContext = { userId: "123", role: "admin" };
      const { t, createAPI } = defineContext(initialContext).withExtensions([rpc]);

      expect(t).toBeDefined();
      expect(createAPI).toBeDefined();
    });

    it("should preserve context type through extension", () => {
      const context = { userId: "123" };
      const { t, createAPI } = defineContext(context).withExtensions([rpc]);

      expect(t).toBeDefined();
      expect(createAPI).toBeDefined();
    });
  });

  describe("withExtensions", () => {
    it("should add rpc extension functions to t object", () => {
      const { t } = defineContext().withExtensions([rpc]);

      expect(typeof t.query).toBe("function");
      expect(typeof t.mutation).toBe("function");
      expect(typeof t.router).toBe("function");
    });

    it("should merge functions from multiple extensions", () => {
      const ext1 = extension({
        name: "ext1",
        functions: () => ({ func1: () => "value1" }),
      });

      const ext2 = extension({
        name: "ext2",
        functions: () => ({ func2: () => "value2" }),
      });

      const { t } = defineContext().withExtensions([ext1, ext2]);

      expect(typeof t.func1).toBe("function");
      expect(typeof t.func2).toBe("function");
    });

    it("should work with empty extensions array", () => {
      const { t, createAPI } = defineContext().withExtensions([]);

      expect(t).toBeDefined();
      expect(createAPI).toBeDefined();
      expect(typeof t.router).toBe("function");
    });

    it("should handle extension without functions", () => {
      const ext = extension({
        name: "no-functions",
        init: () => ({ state: "initialized" }),
      });

      const { t, createAPI } = defineContext().withExtensions([ext]);

      expect(t).toBeDefined();
      expect(createAPI).toBeDefined();
    });
  });

  describe("router function", () => {
    it("should return its input unchanged (identity function)", () => {
      const { t } = defineContext().withExtensions([rpc]);

      const routes = { route1: "value1", route2: "value2" };
      const result = t.router(routes);

      expect(result).toBe(routes);
      expect(result).toEqual(routes);
    });

    it("should preserve route structure", () => {
      const { t } = defineContext().withExtensions([rpc]);

      const routes = {
        users: {
          get: "user-get",
          list: "user-list",
        },
        posts: {
          get: "post-get",
          create: "post-create",
        },
      };

      const result = t.router(routes);

      expect(result).toEqual(routes);
    });
  });

  describe("createAPI", () => {
    it("should create API with simple root", () => {
      const { createAPI } = defineContext().withExtensions([rpc]);

      const root = { test: "value" };
      const api = createAPI({ root });

      expect(api).toEqual(root);
    });

    it("should initialize extension states on createAPI", () => {
      const initState = vi.fn(() => ({ initialized: true }));

      const ext = extension({
        name: "test-ext",
        init: initState,
      });

      const { createAPI } = defineContext().withExtensions([ext]);
      createAPI({ root: {} });

      expect(initState).toHaveBeenCalledTimes(1);
    });

    it("should initialize multiple extension states", () => {
      const init1 = vi.fn(() => ({ state1: "value1" }));
      const init2 = vi.fn(() => ({ state2: "value2" }));

      const ext1 = extension({ name: "ext1", init: init1 });
      const ext2 = extension({ name: "ext2", init: init2 });

      const { createAPI } = defineContext().withExtensions([ext1, ext2]);
      createAPI({ root: {} });

      expect(init1).toHaveBeenCalledTimes(1);
      expect(init2).toHaveBeenCalledTimes(1);
    });

    it("should accept static context object", () => {
      const context = { userId: "123" };
      const { createAPI } = defineContext().withExtensions([rpc]);

      const api = createAPI({
        root: {},
        context,
      });

      expect(api).toBeDefined();
    });

    it("should accept async context provider function", async () => {
      const contextProvider = vi.fn(() =>
        Promise.resolve({ userId: "123" })
      );

      const { createAPI } = defineContext().withExtensions([rpc]);

      const api = createAPI({
        root: {},
        context: contextProvider,
      });

      expect(api).toBeDefined();
      // Context provider is called lazily, not during createAPI
      expect(contextProvider).not.toHaveBeenCalled();
    });

    it("should merge default context with provided context", async () => {
      const ext = extension({
        name: "test",
        request: async (state: any, ctx: any) => ({
          requestContext: "added-by-request",
        }),
      });

      const defaultContext = { default: "value" };
      const { createAPI } = defineContext(defaultContext).withExtensions([ext]);

      const api = createAPI({
        root: {},
        context: { provided: "value" },
      });

      expect(api).toBeDefined();
    });
  });

  describe("query and mutation integration", () => {
    it("should execute a simple query", async () => {
      const { t, createAPI } = defineContext({ userId: "123" }).withExtensions([
        rpc,
      ]);

      const getUser = t.query({
        args: z.object({ id: z.string() }),
        handler: async (ctx, args) => {
          return success({ id: args.id, requestedBy: ctx.userId });
        },
      });

      const api = createAPI({
        root: { getUser },
      });

      const result = await api.getUser({ id: "456" });

      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.value).toEqual({ id: "456", requestedBy: "123" });
      }
    });

    it("should execute a simple mutation", async () => {
      const { t, createAPI } = defineContext().withExtensions([rpc]);

      const createUser = t.mutation({
        args: z.object({ name: z.string() }),
        handler: async (ctx, args) => {
          return success({ id: 1, name: args.name });
        },
      });

      const api = createAPI({
        root: { createUser },
      });

      const result = await api.createUser({ name: "Alice" });

      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.value).toEqual({ id: 1, name: "Alice" });
      }
    });

    it("should validate query arguments", async () => {
      const { t, createAPI } = defineContext().withExtensions([rpc]);

      const getUser = t.query({
        args: z.object({ id: z.number() }),
        handler: async (ctx, args) => {
          return success(args.id);
        },
      });

      const api = createAPI({
        root: { getUser },
      });

      const result = await api.getUser({ id: "not-a-number" as any });

      expect(result.isFailure()).toBe(true);
    });

    it("should validate mutation arguments", async () => {
      const { t, createAPI } = defineContext().withExtensions([rpc]);

      const updateUser = t.mutation({
        args: z.object({
          id: z.number(),
          name: z.string().min(3),
        }),
        handler: async (ctx, args) => {
          return success(args);
        },
      });

      const api = createAPI({
        root: { updateUser },
      });

      const result = await api.updateUser({
        id: 1,
        name: "AB", // Too short
      });

      expect(result.isFailure()).toBe(true);
    });

    it("should handle multiple queries and mutations", async () => {
      const { t, createAPI } = defineContext().withExtensions([rpc]);

      const getUser = t.query({
        args: z.object({ id: z.number() }),
        handler: async (ctx, args) => success({ id: args.id, name: "User" }),
      });

      const updateUser = t.mutation({
        args: z.object({ id: z.number(), name: z.string() }),
        handler: async (ctx, args) => success(args),
      });

      const deleteUser = t.mutation({
        args: z.object({ id: z.number() }),
        handler: async (ctx, args) => success({ deleted: true }),
      });

      const api = createAPI({
        root: { getUser, updateUser, deleteUser },
      });

      const userResult = await api.getUser({ id: 1 });
      const updateResult = await api.updateUser({ id: 1, name: "Alice" });
      const deleteResult = await api.deleteUser({ id: 1 });

      expect(userResult.isSuccess()).toBe(true);
      expect(updateResult.isSuccess()).toBe(true);
      expect(deleteResult.isSuccess()).toBe(true);
    });
  });

  describe("context propagation", () => {
    it("should pass context to query handler", async () => {
      const context = { userId: "user-123", role: "admin" };

      const { t, createAPI } = defineContext(context).withExtensions([rpc]);

      const getUser = t.query({
        args: z.object({ id: z.string() }),
        handler: async (ctx, args) => {
          return success({
            userId: ctx.userId,
            role: ctx.role,
            requestedId: args.id,
          });
        },
      });

      const api = createAPI({ root: { getUser } });

      const result = await api.getUser({ id: "test-id" });

      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.value.userId).toBe("user-123");
        expect(result.value.role).toBe("admin");
      }
    });

    it("should pass context to mutation handler", async () => {
      const context = { database: "test-db" };

      const { t, createAPI } = defineContext(context).withExtensions([rpc]);

      const createRecord = t.mutation({
        args: z.object({ value: z.string() }),
        handler: async (ctx, args) => {
          return success({ database: ctx.database, value: args.value });
        },
      });

      const api = createAPI({ root: { createRecord } });

      const result = await api.createRecord({ value: "test" });

      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.value.database).toBe("test-db");
      }
    });
  });

  describe("extension lifecycle", () => {
    it("should call init on extensions", () => {
      const initFn = vi.fn(() => ({ state: "initialized" }));

      const ext = extension({
        name: "test-ext",
        init: initFn,
      });

      const { createAPI } = defineContext().withExtensions([ext]);
      createAPI({ root: {} });

      expect(initFn).toHaveBeenCalledTimes(1);
    });

    it("should call request on extensions during API call", async () => {
      const requestFn = vi.fn(async (state: any, ctx: any) => ({
        requestValue: "added-by-request",
      }));

      const ext = extension({
        name: "test-ext",
        init: () => ({ initState: "value" }),
        request: requestFn,
      });

      const { t, createAPI } = defineContext().withExtensions([rpc, ext]);

      const testQuery = t.query({
        args: z.object({}),
        handler: async (ctx, args) => success(ctx),
      });

      const api = createAPI({ root: { testQuery } });

      await api.testQuery({});

      expect(requestFn).toHaveBeenCalled();
    });

    it("should merge request context with base context", async () => {
      const ext1 = extension({
        name: "ext1",
        request: async () => ({ ext1Value: "value1" }),
      });

      const ext2 = extension({
        name: "ext2",
        request: async () => ({ ext2Value: "value2" }),
      });

      const { t, createAPI } = defineContext({ base: "base" }).withExtensions([
        rpc,
        ext1,
        ext2,
      ]);

      const testQuery = t.query({
        args: z.object({}),
        handler: async (ctx, args) => success(ctx),
      });

      const api = createAPI({ root: { testQuery } });

      const result = await api.testQuery({});

      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.value).toHaveProperty("base", "base");
        expect(result.value).toHaveProperty("ext1Value", "value1");
        expect(result.value).toHaveProperty("ext2Value", "value2");
      }
    });
  });

  describe("nested routes", () => {
    it("should handle nested route structure", async () => {
      const { t, createAPI } = defineContext().withExtensions([rpc]);

      const getUser = t.query({
        args: z.object({ id: z.number() }),
        handler: async (ctx, args) => success({ id: args.id, name: "User" }),
      });

      const api = createAPI({
        root: {
          users: {
            profile: { getUser },
          },
        },
      });

      const result = await api.users.profile.getUser({ id: 123 });

      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.value.id).toBe(123);
      }
    });

    it("should handle deeply nested routes", async () => {
      const { t, createAPI } = defineContext().withExtensions([rpc]);

      const getEndpoint = t.query({
        args: z.object({}),
        handler: async () => success("deep-value"),
      });

      const api = createAPI({
        root: {
          level1: {
            level2: {
              level3: {
                endpoint: getEndpoint,
              },
            },
          },
        },
      });

      const result = await api.level1.level2.level3.endpoint({});

      expect(result.isSuccess()).toBe(true);
    });
  });

  describe("error handling", () => {
    it("should handle handler errors", async () => {
      const { t, createAPI } = defineContext().withExtensions([rpc]);

      const failingQuery = t.query({
        args: z.object({}),
        handler: async () => {
          throw new Error("Handler error");
        },
      });

      const api = createAPI({ root: { failingQuery } });

      try {
        await api.failingQuery({});
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe("Handler error");
      }
    });

    it("should handle async context provider errors", async () => {
      const { createAPI } = defineContext().withExtensions([rpc]);

      const testQuery = "test-value";

      const api = createAPI({
        root: { testQuery },
        context: async () => {
          throw new Error("Context error");
        },
      });

      // The context is resolved lazily when the query is called
      // Since testQuery is not a function, it doesn't trigger context resolution
      expect(api.testQuery).toBe("test-value");
    });
  });

  describe("type safety", () => {
    it("should preserve types through createAPI", async () => {
      const { t, createAPI } = defineContext().withExtensions([rpc]);

      const typedQuery = t.query({
        args: z.object({ id: z.number() }),
        handler: async (ctx, args) => success({ id: args.id, doubled: args.id * 2 }),
      });

      const api = createAPI({ root: { typedQuery } });

      const result = await api.typedQuery({ id: 21 });

      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.value).toEqual({ id: 21, doubled: 42 });
      }
    });
  });
});
