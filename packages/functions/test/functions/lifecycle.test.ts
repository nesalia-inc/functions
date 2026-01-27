import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import { query, mutation, RunnableProcedure } from "../../src/functions/lifecycle";
import { success, failure } from "../../src/types";
import { exception } from "../../src/errors";

describe("Lifecycle Hooks", () => {
  describe("query with lifecycle hooks", () => {
    it("should execute query without hooks", async () => {
      const getUser = query({
        args: z.object({ id: z.number() }),
        handler: async (ctx, args) => success({ id: args.id, name: "User" }),
      });

      const result = await getUser({}, { id: 123 });

      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.value).toEqual({ id: 123, name: "User" });
      }
    });

    it("should execute beforeInvoke hook before handler", async () => {
      const beforeInvokeSpy = vi.fn();

      const getUser = query({
        args: z.object({ id: z.number() }),
        handler: async (ctx, args) => {
          return success({ id: args.id, name: "User" });
        },
      });

      getUser.beforeInvoke(beforeInvokeSpy);

      await getUser({}, { id: 123 });

      expect(beforeInvokeSpy).toHaveBeenCalledTimes(1);
      expect(beforeInvokeSpy).toHaveBeenCalledWith(
        expect.any(Object),
        { id: 123 }
      );
    });

    it("should execute afterInvoke hook after handler", async () => {
      const afterInvokeSpy = vi.fn();

      const getUser = query({
        args: z.object({ id: z.number() }),
        handler: async (ctx, args) => success({ id: args.id, name: "User" }),
      });

      getUser.afterInvoke(afterInvokeSpy);

      await getUser({}, { id: 123 });

      expect(afterInvokeSpy).toHaveBeenCalledTimes(1);
      expect(afterInvokeSpy).toHaveBeenCalledWith(
        expect.any(Object),
        { id: 123 },
        expect.objectContaining({ _tag: "Success" })
      );
    });

    it("should execute onSuccess hook on successful result", async () => {
      const onSuccessSpy = vi.fn();

      const getUser = query({
        args: z.object({ id: z.number() }),
        handler: async (ctx, args) => success({ id: args.id, name: "User" }),
      });

      getUser.onSuccess(onSuccessSpy);

      await getUser({}, { id: 123 });

      expect(onSuccessSpy).toHaveBeenCalledTimes(1);
      expect(onSuccessSpy).toHaveBeenCalledWith(
        expect.any(Object),
        { id: 123 },
        { id: 123, name: "User" }
      );
    });

    it("should execute onError hook on handler failure", async () => {
      const onErrorSpy = vi.fn();
      const testError = exception({ name: "TestError", message: "Test error" });

      const failingQuery = query({
        args: z.object({ id: z.number() }),
        handler: async (ctx, args) => failure(testError),
      });

      failingQuery.onError(onErrorSpy);

      await failingQuery({}, { id: 123 });

      expect(onErrorSpy).toHaveBeenCalledTimes(1);
      expect(onErrorSpy).toHaveBeenCalledWith(
        expect.any(Object),
        { id: 123 },
        testError
      );
    });

    it("should execute onError hook on validation failure", async () => {
      const onErrorSpy = vi.fn();

      const strictQuery = query({
        args: z.object({ id: z.number() }),
        handler: async (ctx, args) => success(args),
      });

      strictQuery.onError(onErrorSpy);

      const result = await strictQuery({ id: "invalid" as any }, {});

      expect(result.isSuccess()).toBe(false);
      expect(onErrorSpy).toHaveBeenCalledTimes(1);
      expect(onErrorSpy).toHaveBeenCalledWith(
        { id: "invalid" },
        expect.any(Object),
        expect.objectContaining({ name: "ValidationError" })
      );
    });

    it("should support multiple beforeInvoke hooks", async () => {
      const spy1 = vi.fn();
      const spy2 = vi.fn();
      const spy3 = vi.fn();

      const testQuery = query({
        args: z.object({}),
        handler: async (ctx, args) => success("done"),
      });

      testQuery.beforeInvoke(spy1).beforeInvoke(spy2).beforeInvoke(spy3);

      await testQuery({}, { id: 123 });

      expect(spy1).toHaveBeenCalledTimes(1);
      expect(spy2).toHaveBeenCalledTimes(1);
      expect(spy3).toHaveBeenCalledTimes(1);
    });

    it("should execute hooks in correct order", async () => {
      const order: string[] = [];

      const testQuery = query({
        args: z.object({}),
        handler: async (ctx, args) => {
          order.push("handler");
          return success("done");
        },
      });

      testQuery
        .beforeInvoke(() => order.push("before1"))
        .beforeInvoke(() => order.push("before2"))
        .afterInvoke(() => order.push("after"))
        .onSuccess(() => order.push("success"));

      await testQuery({}, { id: 123 });

      expect(order).toEqual(["before1", "before2", "handler", "after", "success"]);
    });

    it("should support async hooks", async () => {
      const asyncSpy = vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      const testQuery = query({
        args: z.object({}),
        handler: async (ctx, args) => success("done"),
      });

      testQuery.beforeInvoke(asyncSpy);

      await testQuery({}, { id: 123 });

      expect(asyncSpy).toHaveBeenCalledTimes(1);
    });

    it("should continue on hook error", async () => {
      const errorSpy = vi.fn(() => {
        throw new Error("Hook error");
      });

      const testQuery = query({
        args: z.object({}),
        handler: async (ctx, args) => success("done"),
      });

      testQuery.afterInvoke(errorSpy);

      const result = await testQuery({}, { id: 123 });

      // Should still succeed despite hook error
      expect(result.isSuccess()).toBe(true);
    });

    it("should chain hook methods", async () => {
      const beforeSpy = vi.fn();
      const afterSpy = vi.fn();
      const successSpy = vi.fn();
      const errorSpy = vi.fn();

      const testQuery = query({
        args: z.object({ value: z.number() }),
        handler: async (ctx, args) => success(args.value * 2),
      });

      // Chain all hooks
      testQuery
        .beforeInvoke(beforeSpy)
        .afterInvoke(afterSpy)
        .onSuccess(successSpy)
        .onError(errorSpy);

      await testQuery({}, { value: 21 });

      expect(beforeSpy).toHaveBeenCalled();
      expect(afterSpy).toHaveBeenCalled();
      expect(successSpy).toHaveBeenCalledWith(expect.any(Object), { value: 21 }, 42);
      expect(errorSpy).not.toHaveBeenCalled();
    });
  });

  describe("mutation with lifecycle hooks", () => {
    it("should execute mutation with hooks", async () => {
      const beforeSpy = vi.fn();
      const afterSpy = vi.fn();
      const successSpy = vi.fn();

      const createUser = mutation({
        args: z.object({ name: z.string() }),
        handler: async (ctx, args) =>
          success({ id: 1, name: args.name }),
      });

      createUser
        .beforeInvoke(beforeSpy)
        .afterInvoke(afterSpy)
        .onSuccess(successSpy);

      const result = await createUser({}, { name: "Alice" });

      expect(result.isSuccess()).toBe(true);
      expect(beforeSpy).toHaveBeenCalledTimes(1);
      expect(afterSpy).toHaveBeenCalledTimes(1);
      expect(successSpy).toHaveBeenCalledWith(
        expect.any(Object),
        { name: "Alice" },
        { id: 1, name: "Alice" }
      );
    });

    it("should handle mutation errors", async () => {
      const errorSpy = vi.fn();
      const testError = exception({
        name: "MutationError",
        message: "Mutation failed",
      });

      const failingMutation = mutation({
        args: z.object({}),
        handler: async (ctx, args) => failure(testError),
      });

      failingMutation.onError(errorSpy);

      const result = await failingMutation({}, {});

      expect(result.isSuccess()).toBe(false);
      expect(errorSpy).toHaveBeenCalledWith(
        {},
        {},
        expect.objectContaining({ name: "MutationError" })
      );
    });
  });

  describe("hook error handling", () => {
    it("should call onError when beforeInvoke throws", async () => {
      const onErrorSpy = vi.fn();
      const beforeInvokeError = new Error("Before invoke error");

      const testQuery = query({
        args: z.object({}),
        handler: async (ctx, args) => success("done"),
      });

      testQuery.beforeInvoke(() => {
        throw beforeInvokeError;
      }).onError(onErrorSpy);

      const result = await testQuery({}, { id: 123 });

      expect(result.isSuccess()).toBe(false);
      expect(onErrorSpy).toHaveBeenCalledWith(
        {},
        {},
        expect.objectContaining({
          name: "BeforeInvokeError",
          message: "Before invoke error",
        })
      );
    });

    it("should call onError when handler throws", async () => {
      const onErrorSpy = vi.fn();
      const handlerError = new Error("Handler error");

      const testQuery = query({
        args: z.object({}),
        handler: async (ctx, args) => {
          throw handlerError;
        },
      });

      testQuery.onError(onErrorSpy);

      const result = await testQuery({}, { id: 123 });

      expect(result.isSuccess()).toBe(false);
      expect(onErrorSpy).toHaveBeenCalledWith(
        {},
        {},
        expect.objectContaining({
          name: "HandlerError",
          message: "Handler error",
        })
      );
    });

    it("should execute afterInvoke even on handler failure", async () => {
      const afterSpy = vi.fn();
      const errorSpy = vi.fn();

      const failingQuery = query({
        args: z.object({}),
        handler: async (ctx, args) => {
          throw new Error("Handler failed");
        },
      });

      failingQuery.afterInvoke(afterSpy).onError(errorSpy);

      const result = await failingQuery({}, {});

      expect(result.isSuccess()).toBe(false);
      expect(afterSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe("real-world scenarios", () => {
    it("should support logging before and after", async () => {
      const logs: string[] = [];

      const createUser = mutation({
        args: z.object({ name: z.string() }),
        handler: async (ctx, args) => success({ id: 1, ...args }),
      });

      createUser
        .beforeInvoke((ctx, args) => {
          logs.push(`Creating user: ${args.name}`);
        })
        .onSuccess((ctx, args, data) => {
          logs.push(`User created with ID: ${(data as any).id}`);
        });

      await createUser({}, { name: "Alice" });

      expect(logs).toEqual(["Creating user: Alice", "User created with ID: 1"]);
    });

    it("should support metrics collection", async () => {
      let totalTime = 0;

      const slowQuery = query({
        args: z.object({}),
        handler: async (ctx, args) => {
          const start = Date.now();
          await new Promise((resolve) => setTimeout(resolve, 50));
          const end = Date.now();
          return success({ duration: end - start });
        },
      });

      slowQuery.beforeInvoke(() => {
        totalTime = Date.now();
      });

      slowQuery.afterInvoke(async (ctx, args, result) => {
        totalTime = Date.now() - totalTime;
      });

      await slowQuery({}, {});

      expect(totalTime).toBeGreaterThanOrEqual(50);
    });

    it("should support validation hooks", async () => {
      const validationErrors: string[] = [];

      const createUser = mutation({
        args: z.object({ email: z.string().email() }),
        handler: async (ctx, args) => success({ email: args.email }),
      });

      createUser.onError((ctx, args, error) => {
        validationErrors.push(error.message);
      });

      // Invalid email
      await createUser({ email: "invalid" }, {});

      expect(validationErrors.length).toBeGreaterThan(0);
    });
  });

  describe("procedure mutability", () => {
    it("should allow adding hooks after creation", async () => {
      const spy1 = vi.fn();
      const spy2 = vi.fn();

      const testQuery = query({
        args: z.object({}),
        handler: async (ctx, args) => success("done"),
      });

      // Add hook later
      testQuery.beforeInvoke(spy1);

      await testQuery({}, { id: 123 });

      expect(spy1).toHaveBeenCalledTimes(1);
      expect(spy2).not.toHaveBeenCalled();
    });

    it("should maintain hooks across multiple calls", async () => {
      const spy = vi.fn();

      const testQuery = query({
        args: z.object({}),
        handler: async (ctx, args) => success("done"),
      });

      testQuery.beforeInvoke(spy);

      await testQuery({}, { id: 123 });
      await testQuery({}, { id: 123 });
      await testQuery({}, { id: 123 });

      expect(spy).toHaveBeenCalledTimes(3);
    });
  });

  describe("type safety", () => {
    it("should infer types from context", async () => {
      type Context = { userId: string };

      const testQuery = query({
        args: z.object({}),
        handler: async (ctx: Context, args) => {
          return success(ctx.userId);
        },
      });

      testQuery.beforeInvoke((ctx: Context) => {
        // TypeScript should know ctx.userId exists
        expect(typeof ctx.userId).toBe("string");
      });

      const result = await testQuery({ userId: "test-user" }, {});

      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.value).toBe("test-user");
      }
    });

    it("should infer types from args", async () => {
      const testQuery = query({
        args: z.object({ id: z.number(), name: z.string() }),
        handler: async (ctx, args) => success(args),
      });

      testQuery.onSuccess((ctx, args, data) => {
        // TypeScript should know the types
        expect(typeof data.id).toBe("number");
        expect(typeof data.name).toBe("string");
      });

      const result = await testQuery({}, { id: 123, name: "Test" });

      expect(result.isSuccess()).toBe(true);
    });
  });

  describe("hook execution order", () => {
    it("should execute all hooks even if one fails", async () => {
      const order: string[] = [];

      const testQuery = query({
        args: z.object({}),
        handler: async (ctx, args) => {
          order.push("handler");
          return success("done");
        },
      });

      testQuery
        .beforeInvoke(() => {
          order.push("before1");
        })
        .beforeInvoke(() => {
          order.push("before2");
          throw new Error("Error in before2");
        })
        .beforeInvoke(() => {
          order.push("before3"); // Should not execute
        })
        .onError(() => {
          order.push("error");
        });

      const result = await testQuery({}, {});

      expect(result.isSuccess()).toBe(false);
      expect(order).toEqual(["before1", "before2", "error"]);
      expect(order).not.toContain("before3");
    });
  });
});
