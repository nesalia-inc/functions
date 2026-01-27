import { describe, it, expect } from "vitest";
import { defineContext } from "../../src/context/define";
import { rpc } from "../../src/extensions/rpc";
import { success } from "../../src/types";

describe("Edge Cases: Circular References", () => {
  describe("createAPI with circular references", () => {
    it("should handle self-referencing object", () => {
      const { createAPI } = defineContext().withExtensions([rpc]);

      const circular: any = { name: "test" };
      circular.self = circular;

      // This should not cause infinite recursion at creation time
      expect(() => createAPI({ root: circular })).not.toThrow();
    });

    it("should detect circular reference in API structure", () => {
      const { createAPI } = defineContext().withExtensions([rpc]);

      const obj1: any = { name: "obj1" };
      const obj2: any = { name: "obj2" };
      obj1.ref = obj2;
      obj2.ref = obj1;

      // Should handle without infinite recursion
      expect(() => createAPI({ root: { obj1, obj2 } })).not.toThrow();
    });

    it("should handle circular reference in deeply nested structure", () => {
      const { createAPI } = defineContext().withExtensions([rpc]);

      const root: any = { level: 0 };
      let current = root;
      for (let i = 1; i <= 5; i++) {
        current.next = { level: i };
        current = current.next;
      }
      current.loop = root;

      expect(() => createAPI({ root })).not.toThrow();
    });
  });

  describe("Deeply nested structures", () => {
    it("should handle 10 levels of nesting", async () => {
      const { t, createAPI } = defineContext().withExtensions([rpc]);

      const endpoint = t.query({
        args: z.object({}),
        handler: async () => success("deep value"),
      });

      const api = createAPI({
        root: {
          l1: { l2: { l3: { l4: { l5: { l6: { l7: { l8: { l9: { l10: { endpoint } } } } } } } } } },
        },
        runtimeContext: {}
      });

      expect(typeof api.l1.l2.l3.l4.l5.l6.l7.l8.l9.l10.endpoint).toBe("function");
    });

    it("should handle 20 levels of nesting", async () => {
      const { t, createAPI } = defineContext().withExtensions([rpc]);

      const endpoint = t.query({
        args: z.object({}),
        handler: async () => success("very deep value"),
      });

      // Build a 20-level deep structure
      let deep: any = { endpoint };
      for (let i = 19; i >= 1; i--) {
        deep = { [`level${i}`]: deep };
      }

      const api = createAPI({ root: deep, runtimeContext: {} });

      // Access the deeply nested endpoint
      let current = api;
      for (let i = 1; i <= 19; i++) {
        current = current[`level${i}`];
      }

      expect(typeof current.endpoint).toBe("function");
    });

    it("should handle wide structures with many siblings", async () => {
      const { t, createAPI } = defineContext().withExtensions([rpc]);

      const endpoints: Record<string, any> = {};
      for (let i = 1; i <= 50; i++) {
        endpoints[`endpoint${i}`] = t.query({
          args: z.object({ id: z.number() }),
          handler: async (ctx, args) => success({ id: args.id, endpoint: i }),
        });
      }

      const api = createAPI({ root: endpoints, runtimeContext: {} });

      // Test a few endpoints
      const result1 = await api.endpoint1({ id: 1 });
      const result25 = await api.endpoint25({ id: 25 });
      const result50 = await api.endpoint50({ id: 50 });

      expect(result1.isSuccess()).toBe(true);
      expect(result25.isSuccess()).toBe(true);
      expect(result50.isSuccess()).toBe(true);
    });

    it("should handle mixed wide and deep structures", async () => {
      const { t, createAPI } = defineContext().withExtensions([rpc]);

      const createLevel = (depth: number, width: number): any => {
        if (depth === 0) {
          const result: any = {};
          for (let i = 0; i < width; i++) {
            result[`item${i}`] = t.query({
              args: z.object({}),
              handler: async () => success(`item${i}`),
            });
          }
          return result;
        }

        const result: any = {};
        for (let i = 0; i < width; i++) {
          result[`level${depth}_${i}`] = createLevel(depth - 1, width);
        }
        return result;
      };

      const api = createAPI({ root: createLevel(3, 3), runtimeContext: {} });

      expect(api).toBeDefined();
      expect(typeof api.level3_0.level2_0.level1_0.item0).toBe("function");
    });
  });

  describe("Complex nesting patterns", () => {
    it("should handle diamond pattern (multiple paths to same node)", () => {
      const { createAPI } = defineContext().withExtensions([rpc]);

      const sharedNode = { value: "shared" };
      const root = {
        path1: { shared: sharedNode },
        path2: { shared: sharedNode },
      };

      expect(() => createAPI({ root })).not.toThrow();
    });

    it("should handle array values in structure", () => {
      const { t, createAPI } = defineContext().withExtensions([rpc]);

      const endpoint = t.query({
        args: z.object({}),
        handler: async () => success("array test"),
      });

      const api = createAPI({
        root: {
          arrayLevel: [
            { endpoint1: endpoint },
            { endpoint2: endpoint },
            { endpoint3: endpoint },
          ],
        },
      });

      expect(api.arrayLevel).toBeDefined();
      expect(Array.isArray(api.arrayLevel)).toBe(true);
    });

    it("should handle mixed object and array nesting", () => {
      const { t, createAPI } = defineContext().withExtensions([rpc]);

      const endpoint = t.query({
        args: z.object({}),
        handler: async () => success("mixed test"),
      });

      const api = createAPI({
        root: {
          level1: {
            array: [
              { item1: { endpoint } },
              { item2: { level2: { endpoint } } },
            ],
            direct: { endpoint },
          },
        },
      });

      expect(api.level1.array[0].item1.endpoint).toBeDefined();
      expect(api.level1.array[1].item2.level2.endpoint).toBeDefined();
      expect(api.level1.direct.endpoint).toBeDefined();
    });
  });

  describe("Non-function values", () => {
    it("should pass through non-function values unchanged", () => {
      const { createAPI } = defineContext().withExtensions([rpc]);

      const api = createAPI({
        root: {
          string: "test",
          number: 42,
          boolean: true,
          null: null,
          undefined: undefined,
          object: { key: "value" },
          array: [1, 2, 3],
        },
      });

      expect(api.string).toBe("test");
      expect(api.number).toBe(42);
      expect(api.boolean).toBe(true);
      expect(api.null).toBe(null);
      expect(api.undefined).toBe(undefined);
      expect(api.object).toEqual({ key: "value" });
      expect(api.array).toEqual([1, 2, 3]);
    });

    it("should preserve Date objects", () => {
      const { createAPI } = defineContext().withExtensions([rpc]);

      const testDate = new Date("2024-01-01");
      const api = createAPI({
        root: {
          date: testDate,
        },
      });

      expect(api.date).toBe(testDate);
      expect(api.date instanceof Date).toBe(true);
    });

    it("should preserve RegExp objects", () => {
      const { createAPI } = defineContext().withExtensions([rpc]);

      const testRegex = /test-regex/g;
      const api = createAPI({
        root: {
          regex: testRegex,
        },
      });

      expect(api.regex).toBe(testRegex);
      expect(api.regex instanceof RegExp).toBe(true);
    });
  });

  describe("Empty and minimal structures", () => {
    it("should handle empty root object", () => {
      const { createAPI } = defineContext().withExtensions([rpc]);

      const api = createAPI({ root: {} });

      expect(api).toEqual({});
    });

    it("should handle root with only non-function values", () => {
      const { createAPI } = defineContext().withExtensions([rpc]);

      const api = createAPI({
        root: {
          config: { value: 1 },
          metadata: { key: "value" },
        },
      });

      expect(api.config).toEqual({ value: 1 });
      expect(api.metadata).toEqual({ key: "value" });
    });

    it("should handle mixed functions and values", async () => {
      const { t, createAPI } = defineContext().withExtensions([rpc]);

      const endpoint = t.query({
        args: z.object({}),
        handler: async () => success("test"),
      });

      const api = createAPI({
        root: {
          endpoint,
          config: { value: 1 },
          metadata: { key: "value" },
        },
      });

      expect(typeof api.endpoint).toBe("function");
      expect(api.config).toEqual({ value: 1 });
      expect(api.metadata).toEqual({ key: "value" });
    });
  });

  describe("Special object types", () => {
    it("should handle objects with prototype chain", () => {
      const { createAPI } = defineContext().withExtensions([rpc]);

      const prototype = { sharedMethod: () => "shared" };
      const instance = Object.create(prototype);
      instance.ownProperty = "own";

      const api = createAPI({ root: { instance } });

      expect(api.instance.ownProperty).toBe("own");
    });

    it("should handle frozen objects", () => {
      const { createAPI } = defineContext().withExtensions([rpc]);

      const frozen = Object.freeze({ value: "immutable" });

      const api = createAPI({ root: { frozen } });

      expect(api.frozen).toEqual({ value: "immutable" });
    });

    it("should handle sealed objects", () => {
      const { createAPI } = defineContext().withExtensions([rpc]);

      const sealed = Object.seal({ value: "sealed" });

      const api = createAPI({ root: { sealed } });

      expect(api.sealed).toEqual({ value: "sealed" });
    });
  });
});
