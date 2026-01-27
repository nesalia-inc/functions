import { describe, it, expect } from "vitest";
import { extension, withKind } from "../../src/extensions";
import { HKT, Apply } from "../../src/utils/hkt";

describe("Extension System Types", () => {
  describe("extension function", () => {
    it("should create extension with name", () => {
      const ext = extension({
        name: "test-extension",
      });

      expect(ext).toHaveProperty("name", "test-extension");
    });

    it("should create extension with init function", () => {
      const initState = { value: "initialized" };
      const ext = extension({
        name: "test-extension",
        init: () => initState,
      });

      expect(ext).toHaveProperty("name", "test-extension");
      expect(ext).toHaveProperty("init");
      expect(typeof ext.init).toBe("function");
    });

    it("should create extension with request function", () => {
      const ext = extension({
        name: "test-extension",
        request: async (state: any, ctx: any) => ({
          requestValue: "added",
        }),
      });

      expect(ext).toHaveProperty("name", "test-extension");
      expect(ext).toHaveProperty("request");
      expect(typeof ext.request).toBe("function");
    });

    it("should create extension with functions factory", () => {
      const ext = extension({
        name: "test-extension",
        functions: () => ({
          testFunction: () => "test value",
        }),
      });

      expect(ext).toHaveProperty("name", "test-extension");
      expect(ext).toHaveProperty("functions");
      expect(typeof ext.functions).toBe("function");
    });

    it("should create extension with all properties", () => {
      const ext = extension({
        name: "full-extension",
        init: () => ({ state: "initialized" }),
        request: async (state: any, ctx: any) => ({
          requestValue: "added",
        }),
        functions: () => ({
          testFunction: () => "test",
        }),
      });

      expect(ext.name).toBe("full-extension");
      expect(ext.init).toBeDefined();
      expect(ext.request).toBeDefined();
      expect(ext.functions).toBeDefined();
    });

    it("should call init function", () => {
      const initFn = () => ({ initialized: true });
      const ext = extension({
        name: "test",
        init: initFn,
      });

      const state = ext.init?.();

      expect(state).toEqual({ initialized: true });
    });

    it("should call functions factory", () => {
      const ext = extension({
        name: "test",
        functions: () => ({
          func1: () => "value1",
          func2: () => "value2",
        }),
      });

      const functions = ext.functions?.();

      expect(functions).toEqual({
        func1: expect.any(Function),
        func2: expect.any(Function),
      });
    });

    it("should call request function", async () => {
      const ext = extension({
        name: "test",
        request: async (state: any, ctx: any) => ({
          added: "value",
        }),
      });

      const result = await ext.request?.({}, {});

      expect(result).toEqual({ added: "value" });
    });
  });

  describe("HKT system", () => {
    it("should create HKT interface", () => {
      interface TestHKT extends HKT {
        new: string;
      }

      const hkt: TestHKT = {} as TestHKT;

      expect(hkt).toBeDefined();
    });

    it("should apply type with Apply", () => {
      interface TestHKT extends HKT {
        new: {
          value: this["_C"];
        };
      }

      type Result = Apply<TestHKT, number>;

      const test: Result = { value: 42 };

      expect(test.value).toBe(42);
    });

    it("should preserve context type through HKT", () => {
      interface ContextHKT extends HKT {
        new: {
          getContext: () => this["_C"];
        };
      }

      type MyContext = { userId: string };
      type Result = Apply<ContextHKT, MyContext>;

      const result: Result = {
        getContext: () => ({ userId: "test" }),
      };

      const context = result.getContext();
      expect(context.userId).toBe("test");
    });
  });

  describe("withKind function", () => {
    it("should add HKT kind to extension", () => {
      interface TestHKT extends HKT {
        new: { test: "value" };
      }

      const ext = extension({
        name: "test",
        functions: () => ({ test: () => "value" }),
      });

      const withHKT = withKind<TestHKT>()(ext);

      expect(withHKT).toHaveProperty("name", "test");
      // Note: _HKT is a type-only property and doesn't exist at runtime
      // The type system ensures it's present
    });

    it("should preserve extension properties", () => {
      interface TestHKT extends HKT {
        new: {};
      }

      const ext = extension({
        name: "test",
        init: () => ({ state: "init" }),
        request: async () => ({ request: "value" }),
        functions: () => ({ func: () => "func" }),
      });

      const withHKT = withKind<TestHKT>()(ext);

      expect(withHKT.name).toBe("test");
      expect(withHKT.init).toBeDefined();
      expect(withHKT.request).toBeDefined();
      expect(withHKT.functions).toBeDefined();
    });
  });

  describe("extension composition", () => {
    it("should work with multiple extensions", () => {
      const ext1 = extension({
        name: "ext1",
        functions: () => ({ func1: () => "value1" }),
      });

      const ext2 = extension({
        name: "ext2",
        functions: () => ({ func2: () => "value2" }),
      });

      const ext3 = extension({
        name: "ext3",
        functions: () => ({ func3: () => "value3" }),
      });

      expect(ext1.name).toBe("ext1");
      expect(ext2.name).toBe("ext2");
      expect(ext3.name).toBe("ext3");
    });

    it("should support extensions with state", () => {
      const ext1 = extension({
        name: "stateful1",
        init: () => ({ counter: 0 }),
        request: async (state: any) => ({
          counter: (state as any).counter,
        }),
      });

      const ext2 = extension({
        name: "stateful2",
        init: () => ({ timer: Date.now() }),
        request: async (state: any) => ({
          timer: (state as any).timer,
        }),
      });

      const state1 = ext1.init?.();
      const state2 = ext2.init?.();

      expect(state1).toEqual({ counter: 0 });
      expect(state2).toHaveProperty("timer");
    });
  });

  describe("extension functions", () => {
    it("should create function that returns value", () => {
      const ext = extension({
        name: "test",
        functions: () => ({
          getValue: () => "test value",
        }),
      });

      const functions = ext.functions?.();
      expect(functions?.getValue()).toBe("test value");
    });

    it("should create function that takes arguments", () => {
      const ext = extension({
        name: "test",
        functions: () => ({
          add: (a: number, b: number) => a + b,
        }),
      });

      const functions = ext.functions?.();
      expect(functions?.add(2, 3)).toBe(5);
    });

    it("should create async function", async () => {
      const ext = extension({
        name: "test",
        functions: () => ({
          asyncOperation: async () => {
            return "async result";
          },
        }),
      });

      const functions = ext.functions?.();
      const result = await functions?.asyncOperation();
      expect(result).toBe("async result");
    });

    it("should support multiple functions", () => {
      const ext = extension({
        name: "test",
        functions: () => ({
          func1: () => "result1",
          func2: () => "result2",
          func3: () => "result3",
        }),
      });

      const functions = ext.functions?.();

      expect(functions?.func1()).toBe("result1");
      expect(functions?.func2()).toBe("result2");
      expect(functions?.func3()).toBe("result3");
    });

    it("should support nested function objects", () => {
      const ext = extension({
        name: "test",
        functions: () => ({
          level1: {
            level2: {
              nested: () => "deep value",
            },
          },
        }),
      });

      const functions = ext.functions?.();
      expect(functions?.level1.level2.nested()).toBe("deep value");
    });
  });

  describe("extension lifecycle", () => {
    it("should initialize state on init", () => {
      let initCalled = false;
      let initState = {};

      const ext = extension({
        name: "test",
        init: () => {
          initCalled = true;
          initState = { initialized: true };
          return initState;
        },
      });

      expect(initCalled).toBe(false);

      const state = ext.init?.();

      expect(initCalled).toBe(true);
      expect(state).toEqual({ initialized: true });
    });

    it("should handle async request", async () => {
      const ext = extension({
        name: "test",
        request: async (state: any, ctx: any) => {
          return new Promise((resolve) => {
            setTimeout(() => resolve({ async: "value" }), 10);
          });
        },
      });

      const result = await ext.request?.({}, {});

      expect(result).toEqual({ async: "value" });
    });

    it("should pass state to request", async () => {
      const ext = extension({
        name: "test",
        init: () => ({ stateValue: "test" }),
        request: async (state: any) => ({
          received: state.stateValue,
        }),
      });

      const state = ext.init?.();
      const result = await ext.request?.(state as any, {});

      expect(result).toEqual({ received: "test" });
    });

    it("should pass context to request", async () => {
      const ext = extension({
        name: "test",
        request: async (state: any, ctx: any) => ({
          userId: ctx.userId,
        }),
      });

      const result = await ext.request?.({}, { userId: "test-user" });

      expect(result).toEqual({ userId: "test-user" });
    });
  });

  describe("type safety", () => {
    it("should maintain types in functions", () => {
      const ext = extension({
        name: "test",
        functions: () => ({
          stringify: (value: number) => value.toString(),
        }),
      });

      const functions = ext.functions?.();
      const result = functions?.stringify(42);

      expect(typeof result).toBe("string");
      expect(result).toBe("42");
    });

    it("should support generic functions", () => {
      const ext = extension({
        name: "test",
        functions: () => ({
          identity: <T,>(value: T) => value,
        }),
      });

      const functions = ext.functions?.();

      expect(functions?.identity<string>("test")).toBe("test");
      expect(functions?.identity<number>(42)).toBe(42);
    });
  });
});
