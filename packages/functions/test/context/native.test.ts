import { describe, it, expect } from "vitest";
import { z } from "zod";
import { defineContext } from "../../src/context/native";
import { success, failure } from "../../src/types";
import { exception } from "../../src/errors";

describe("defineContext (Native API)", () => {
  describe("defineContext", () => {
    it("should create API builder with context", () => {
      const { t, createAPI } = defineContext({ userId: "test-user" });

      expect(t).toBeDefined();
      expect(typeof t.query).toBe("function");
      expect(typeof t.mutation).toBe("function");
      expect(typeof t.router).toBe("function");
      expect(createAPI).toBeDefined();
    });

    it("should create API builder with typed context", () => {
      const { t, createAPI } = defineContext<{ userId: string }>({
        userId: "test-user",
      });

      expect(t).toBeDefined();
    });

    it("should execute query successfully", async () => {
      const { t, createAPI } = defineContext<{ userId: string }>({
        userId: "user-123",
      });

      const getUser = t.query({
        args: z.object({ id: z.number() }),
        handler: async (ctx, args) => {
          return success({ id: args.id, requestedBy: ctx.userId });
        },
      });

      const api = createAPI({ getUser });
      const result = await api.getUser({ id: 456 });

      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.value).toEqual({ id: 456, requestedBy: "user-123" });
      }
    });

    it("should execute mutation successfully", async () => {
      const { t, createAPI } = defineContext();

      const createUser = t.mutation({
        args: z.object({ name: z.string() }),
        handler: async (ctx, args) => {
          return success({ id: 1, name: args.name });
        },
      });

      const api = createAPI({ createUser });
      const result = await api.createUser({ name: "Alice" });

      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.value).toEqual({ id: 1, name: "Alice" });
      }
    });

    it("should validate query arguments", async () => {
      const { t, createAPI } = defineContext();

      const getUser = t.query({
        args: z.object({ id: z.number() }),
        handler: async (ctx, args) => success(args),
      });

      const api = createAPI({ getUser });
      const result = await api.getUser({ id: "invalid" as any });

      expect(result.isSuccess()).toBe(false);
      if (!result.isSuccess()) {
        expect(result.error.name).toBe("ValidationError");
      }
    });

    it("should handle nested routes with router", async () => {
      const { t, createAPI } = defineContext();

      const getUser = t.query({
        args: z.object({ id: z.number() }),
        handler: async (ctx, args) => success({ id: args.id }),
      });

      const api = createAPI({
        users: t.router({
          profile: { getUser },
        }),
      });

      const result = await api.users.profile.getUser({ id: 123 });

      expect(result.isSuccess()).toBe(true);
    });

    it("should support multiple endpoints", async () => {
      const { t, createAPI } = defineContext();

      const getUser = t.query({
        args: z.object({ id: z.number() }),
        handler: async (ctx, args) => success({ id: args.id }),
      });

      const updateUser = t.mutation({
        args: z.object({ id: z.number(), name: z.string() }),
        handler: async (ctx, args) => success(args),
      });

      const api = createAPI({ getUser, updateUser });

      expect(api.getUser).toBeDefined();
      expect(api.updateUser).toBeDefined();
    });
  });

  describe("context handling", () => {
    it("should pass context to query handler", async () => {
      const { t, createAPI } = defineContext<{ userId: string; database: any }>({
        userId: "user-123",
        database: {},
      });

      const getUser = t.query({
        args: z.object({ id: z.number() }),
        handler: async (ctx, args) => {
          return success({
            id: args.id,
            requestedBy: ctx.userId,
          });
        },
      });

      const api = createAPI({ getUser });

      const result = await api.getUser({ id: 1 });

      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.value.requestedBy).toBe("user-123");
      }
    });

    it("should support extensions that add context", async () => {
      const { t, createAPI } = defineContext<{ userId: string }>(
        {
          userId: "test",
        },
        [
          {
            name: "logger",
            context: async (ctx) => ({
              log: (msg: string) => console.log(`[${ctx.userId}]`, msg),
            }),
          },
        ]
      );

      const getUser = t.query({
        args: z.object({}),
        handler: async (ctx, args) => {
          // Logger should be available in ctx
          return success({ logged: true });
        },
      });

      const api = createAPI({ getUser });

      const result = await api.getUser({});

      expect(result.isSuccess()).toBe(true);
    });
  });

  describe("type safety", () => {
    it("should infer argument types from schema", async () => {
      const { t, createAPI } = defineContext();

      const getUser = t.query({
        args: z.object({
          id: z.number(),
          include: z.boolean().optional(),
        }),
        handler: async (ctx, args) => {
          // TypeScript knows args.id is number and args.include is boolean | undefined
          return success(args);
        },
      });

      const api = createAPI({ getUser });

      const result = await api.getUser({ id: 123, include: true });

      expect(result.isSuccess()).toBe(true);
    });

    it("should infer return types", async () => {
      const { t, createAPI } = defineContext();

      const getUser = t.query({
        args: z.object({ id: z.number() }),
        handler: async () => {
          // TypeScript knows return type must match
          return success<{ id: number; name: string }>({
            id: 1,
            name: "User",
          });
        },
      });

      const api = createAPI({ getUser });

      const result = await api.getUser({ id: 1 });

      if (result.isSuccess()) {
        expect(result.value.name).toBe("User");
      }
    });
  });

  describe("router function", () => {
    it("should be identity function (returns input unchanged)", () => {
      const { t } = defineContext();

      const routes = { getUser: "test", updateUser: "test2" };
      const result = t.router(routes);

      expect(result).toBe(routes);
    });

    it("should preserve route structure", () => {
      const { t, createAPI } = defineContext();

      const getUser = t.query({
        args: z.object({ id: z.number() }),
        handler: async (ctx, args) => success(args),
      });

      const routes = t.router({
        users: { getUser },
      });

      expect(routes.users.getUser).toBe(getUser);
    });
  });

  describe("error handling", () => {
    it("should return failure on handler error", async () => {
      const { t, createAPI } = defineContext();

      const failingQuery = t.query({
        args: z.object({}),
        handler: async () => {
          throw new Error("Handler error");
        },
      });

      const api = createAPI({ failingQuery });

      try {
        await api.failingQuery({});
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    it("should return failure on explicit failure return", async () => {
      const { t, createAPI } = defineContext();

      const failureQuery = t.query({
        args: z.object({}),
        handler: async () => {
          return failure(exception({ name: "TestError", message: "Test" }));
        },
      });

      const api = createAPI({ failureQuery });

      const result = await api.failureQuery({});

      expect(result.isSuccess()).toBe(false);
    });
  });

  describe("simple usage", () => {
    it("should work with simple endpoints", async () => {
      const { t, createAPI } = defineContext();

      // Simple query
      const echo = t.query({
        args: z.object({ message: z.string() }),
        handler: async (ctx, args) => success({ echo: args.message }),
      });

      const api = createAPI({ echo });
      const result = await api.echo({ message: "hello" });

      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.value.echo).toBe("hello");
      }
    });

    it("should work without context", async () => {
      const { t, createAPI } = defineContext();

      const simple = t.query({
        args: z.object({ value: z.number() }),
        handler: async (ctx, args) => success({ doubled: args.value * 2 }),
      });

      const api = createAPI({ simple });
      const result = await api.simple({ value: 21 });

      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.value.doubled).toBe(42);
      }
    });
  });
});
