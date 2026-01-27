import { describe, it, expect } from "vitest";
import { z } from "zod";
import { query, mutation } from "../../src/functions/lifecycle";
import { alias, aliases, withAliases, createCommandRegistry } from "../../src/functions/alias";
import { success } from "../../src/types";

describe("Command Aliases", () => {
  describe("alias()", () => {
    it("should create a single alias for a procedure", async () => {
      const getUser = query({
        args: z.object({ id: z.number() }),
        handler: async (args, ctx) => success({ id: args.id, name: "User" }),
      });

      const fetchUser = alias(getUser, "fetchUser");

      // The alias should reference the same procedure
      expect(fetchUser).toBe(getUser);
      expect((fetchUser as any).fetchUser).toBe(getUser);
    });

    it("should execute through the alias", async () => {
      const getUser = query({
        args: z.object({ id: z.number() }),
        handler: async (args, ctx) => success({ id: args.id, name: "User" }),
      });

      alias(getUser, "fetchUser");

      // Execute through the alias property
      const result = await (getUser as any).fetchUser({ id: 123 }, {});

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBe(123);
      }
    });

    it("should work with mutations", async () => {
      const createUser = mutation({
        args: z.object({ name: z.string() }),
        handler: async (args, ctx) => success({ id: 1, name: args.name }),
      });

      const registerUser = alias(createUser, "registerUser");

      expect(registerUser).toBe(createUser);
    });

    it("should support chaining multiple aliases", async () => {
      const getUser = query({
        args: z.object({ id: z.number() }),
        handler: async (args, ctx) => success({ id: args.id }),
      });

      alias(alias(alias(getUser, "fetchUser"), "retrieveUser"), "getUserById");

      // All aliases should point to the same procedure
      expect((getUser as any).fetchUser).toBe(getUser);
      expect((getUser as any).retrieveUser).toBe(getUser);
      expect((getUser as any).getUserById).toBe(getUser);
    });
  });

  describe("aliases()", () => {
    it("should create multiple aliases at once", async () => {
      const getUser = query({
        args: z.object({ id: z.number() }),
        handler: async (args, ctx) => success({ id: args.id }),
      });

      aliases(getUser, ["fetchUser", "retrieveUser", "getUserById"]);

      expect((getUser as any).fetchUser).toBe(getUser);
      expect((getUser as any).retrieveUser).toBe(getUser);
      expect((getUser as any).getUserById).toBe(getUser);
    });

    it("should work with empty alias array", () => {
      const getUser = query({
        args: z.object({ id: z.number() }),
        handler: async (args, ctx) => success({ id: args.id }),
      });

      const result = aliases(getUser, []);

      expect(result).toBe(getUser);
    });

    it("should preserve existing aliases when adding more", () => {
      const getUser = query({
        args: z.object({ id: z.number() }),
        handler: async (args, ctx) => success({ id: args.id }),
      });

      alias(getUser, "firstAlias");
      aliases(getUser, ["secondAlias", "thirdAlias"]);

      expect((getUser as any).firstAlias).toBe(getUser);
      expect((getUser as any).secondAlias).toBe(getUser);
      expect((getUser as any).thirdAlias).toBe(getUser);
    });
  });

  describe("withAliases()", () => {
    it("should create an API with procedures and aliases", () => {
      const getUser = query({
        args: z.object({ id: z.number() }),
        handler: async (args, ctx) => success({ id: args.id }),
      });

      const createUser = mutation({
        args: z.object({ name: z.string() }),
        handler: async (args, ctx) => success({ id: 1 }),
      });

      const api = withAliases({
        getUser,
        fetchUser: alias(getUser, "getUser"),
        createUser,
        registerUser: alias(createUser, "createUser"),
      });

      expect(api.getUser).toBe(getUser);
      expect(api.fetchUser).toBe(getUser);
      expect(api.createUser).toBe(createUser);
      expect(api.registerUser).toBe(createUser);
    });

    it("should preserve all original procedures", () => {
      const proc1 = query({
        args: z.object({}),
        handler: async () => success("proc1"),
      });

      const proc2 = query({
        args: z.object({}),
        handler: async () => success("proc2"),
      });

      const api = withAliases({
        proc1,
        proc2,
        alias1: alias(proc1, "proc1"),
        alias2: alias(proc2, "proc2"),
      });

      expect(api.proc1).toBe(proc1);
      expect(api.proc2).toBe(proc2);
      expect(api.alias1).toBe(proc1);
      expect(api.alias2).toBe(proc2);
    });

    it("should handle nested objects", () => {
      const getUser = query({
        args: z.object({ id: z.number() }),
        handler: async (args, ctx) => success({ id: args.id }),
      });

      const api = withAliases({
        users: {
          getUser,
          fetchUser: alias(getUser, "getUser"),
        },
      });

      expect(api.users.getUser).toBe(getUser);
      expect(api.users.fetchUser).toBe(getUser);
    });
  });

  describe("createCommandRegistry()", () => {
    it("should register and retrieve commands", async () => {
      const registry = createCommandRegistry();

      const getUser = query({
        args: z.object({ id: z.number() }),
        handler: async (args, ctx) => success({ id: args.id }),
      });

      registry.register("getUser", getUser);

      expect(registry.has("getUser")).toBe(true);
      expect(registry.get("getUser")).toBe(getUser);
    });

    it("should create aliases for registered commands", () => {
      const registry = createCommandRegistry();

      const getUser = query({
        args: z.object({ id: z.number() }),
        handler: async (args, ctx) => success({ id: args.id }),
      });

      registry.register("getUser", getUser);
      registry.alias("getUser", "fetchUser");
      registry.alias("getUser", "retrieveUser");

      expect(registry.has("getUser")).toBe(true);
      expect(registry.has("fetchUser")).toBe(true);
      expect(registry.has("retrieveUser")).toBe(true);

      // All should resolve to the same procedure
      expect(registry.get("getUser")).toBe(getUser);
      expect(registry.get("fetchUser")).toBe(getUser);
      expect(registry.get("retrieveUser")).toBe(getUser);
    });

    it("should get all aliases for a command", () => {
      const registry = createCommandRegistry();

      const getUser = query({
        args: z.object({ id: z.number() }),
        handler: async (args, ctx) => success({ id: args.id }),
      });

      registry.register("getUser", getUser);
      registry.alias("getUser", "fetchUser");
      registry.alias("getUser", "retrieveUser");

      const aliases = registry.getAliases("getUser");

      expect(aliases).toContain("getUser");
      expect(aliases).toContain("fetchUser");
      expect(aliases).toContain("retrieveUser");
    });

    it("should resolve alias to primary command", () => {
      const registry = createCommandRegistry();

      const getUser = query({
        args: z.object({ id: z.number() }),
        handler: async (args, ctx) => success({ id: args.id }),
      });

      registry.register("getUser", getUser);
      registry.alias("getUser", "fetchUser");

      expect(registry.resolve("fetchUser")).toBe("getUser");
      expect(registry.resolve("getUser")).toBeUndefined();
    });

    it("should throw error when aliasing non-existent command", () => {
      const registry = createCommandRegistry();

      expect(() => {
        registry.alias("nonExistent", "alias");
      }).toThrow();
    });

    it("should unregister command and all aliases", () => {
      const registry = createCommandRegistry();

      const getUser = query({
        args: z.object({ id: z.number() }),
        handler: async (args, ctx) => success({ id: args.id }),
      });

      registry.register("getUser", getUser);
      registry.alias("getUser", "fetchUser");
      registry.alias("getUser", "retrieveUser");

      registry.unregister("getUser");

      expect(registry.has("getUser")).toBe(false);
      expect(registry.has("fetchUser")).toBe(false);
      expect(registry.has("retrieveUser")).toBe(false);
    });

    it("should clear all commands", () => {
      const registry = createCommandRegistry();

      const proc1 = query({
        args: z.object({}),
        handler: async () => success("1"),
      });

      const proc2 = query({
        args: z.object({}),
        handler: async () => success("2"),
      });

      registry.register("proc1", proc1);
      registry.register("proc2", proc2);
      registry.alias("proc1", "alias1");

      registry.clear();

      expect(registry.has("proc1")).toBe(false);
      expect(registry.has("proc2")).toBe(false);
      expect(registry.has("alias1")).toBe(false);
    });

    it("should get all names including aliases", () => {
      const registry = createCommandRegistry();

      const getUser = query({
        args: z.object({ id: z.number() }),
        handler: async (args, ctx) => success({ id: args.id }),
      });

      registry.register("getUser", getUser);
      registry.alias("getUser", "fetchUser");
      registry.alias("getUser", "retrieveUser");

      const allNames = registry.getAllNames();

      expect(allNames).toContain("getUser");
      expect(allNames).toContain("fetchUser");
      expect(allNames).toContain("retrieveUser");
    });

    it("should get only primary command names", () => {
      const registry = createCommandRegistry();

      const getUser = query({
        args: z.object({ id: z.number() }),
        handler: async (args, ctx) => success({ id: args.id }),
      });

      const createUser = mutation({
        args: z.object({ name: z.string() }),
        handler: async (args, ctx) => success({ id: 1 }),
      });

      registry.register("getUser", getUser);
      registry.register("createUser", createUser);
      registry.alias("getUser", "fetchUser");

      const primaryNames = registry.getCommandNames();

      expect(primaryNames).toContain("getUser");
      expect(primaryNames).toContain("createUser");
      expect(primaryNames.length).toBe(2);
    });

    it("should provide registry statistics", () => {
      const registry = createCommandRegistry();

      const proc1 = query({
        args: z.object({}),
        handler: async () => success("1"),
      });

      const proc2 = query({
        args: z.object({}),
        handler: async () => success("2"),
      });

      registry.register("proc1", proc1);
      registry.register("proc2", proc2);
      registry.alias("proc1", "alias1");
      registry.alias("proc1", "alias2");

      const stats = registry.getStats();

      expect(stats.primaryCommands).toBe(2);
      expect(stats.totalCommands).toBe(4); // 2 primary + 2 aliases
      expect(stats.totalAliases).toBe(2);
    });
  });

  describe("real-world scenarios", () => {
    it("should support backwards compatibility with API versioning", () => {
      const registry = createCommandRegistry();

      const getUserV2 = query({
        args: z.object({ id: z.number() }),
        handler: async (args, ctx) => success({ id: args.id, version: 2 }),
      });

      // Register v2 as primary
      registry.register("getUser", getUserV2);

      // Add v1 and getUserById as aliases for backwards compatibility
      registry.alias("getUser", "getUserV1");
      registry.alias("getUser", "getUserById");

      // All work the same way
      expect(registry.get("getUser")).toBe(getUserV2);
      expect(registry.get("getUserV1")).toBe(getUserV2);
      expect(registry.get("getUserById")).toBe(getUserV2);
    });

    it("should support naming conventions for different contexts", () => {
      const registry = createCommandRegistry();

      const createUser = mutation({
        args: z.object({ name: z.string() }),
        handler: async (args, ctx) => success({ id: 1, ...args }),
      });

      registry.register("createUser", createUser);

      // Add aliases for different contexts
      registry.alias("createUser", "registerUser"); // Auth context
      registry.alias("createUser", "addUser"); // Admin context
      registry.alias("createUser", "insertUser"); // Database context

      const allAliases = registry.getAliases("createUser");

      expect(allAliases).toHaveLength(4);
      expect(allAliases).toContain("createUser");
      expect(allAliases).toContain("registerUser");
      expect(allAliases).toContain("addUser");
      expect(allAliases).toContain("insertUser");
    });

    it("should support procedure migration", () => {
      // Old procedure
      const getUserNameOld = query({
        args: z.object({ userId: z.number() }),
        handler: async (args, ctx) => success({ name: "User" }),
      });

      // New procedure with different args
      const getUserNew = query({
        args: z.object({ id: z.number() }),
        handler: async (args, ctx) => success({ id: args.id, name: "User" }),
      });

      const registry = createCommandRegistry();

      // Register new as primary
      registry.register("getUser", getUserNew);

      // Keep old name pointing to new implementation
      registry.alias("getUser", "getUserName");

      // Now old clients using "getUserName" get the new implementation
      expect(registry.get("getUserName")).toBe(getUserNew);
    });
  });

  describe("type safety", () => {
    it("should preserve types through aliases", async () => {
      type Context = { userId: string };

      const getUser = query<{
        id: number;
      }, Context, { id: number; name: string }>({
        args: z.object({ id: z.number() }),
        handler: async (args, ctx) => success({ id: args.id, name: "User" }),
      });

      const fetchUser = alias(getUser, "fetchUser");

      // Types should be preserved
      const result = await fetchUser({ id: 123 }, { userId: "test" });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBe(123);
        expect(result.value.name).toBe("User");
      }
    });
  });

  describe("edge cases", () => {
    it("should handle aliasing to itself", () => {
      const registry = createCommandRegistry();

      const getUser = query({
        args: z.object({ id: z.number() }),
        handler: async (args, ctx) => success({ id: args.id }),
      });

      registry.register("getUser", getUser);

      // Aliasing to itself should be idempotent
      registry.alias("getUser", "getUser");

      expect(registry.get("getUser")).toBe(getUser);
    });

    it("should handle duplicate aliases", () => {
      const registry = createCommandRegistry();

      const proc1 = query({
        args: z.object({}),
        handler: async () => success("1"),
      });

      const proc2 = query({
        args: z.object({}),
        handler: async () => success("2"),
      });

      registry.register("proc1", proc1);
      registry.register("proc2", proc2);

      // Create same alias for both (last one wins)
      registry.alias("proc1", "shared");
      registry.alias("proc2", "shared");

      // The shared alias should point to proc2 (last registered)
      expect(registry.get("shared")).toBe(proc2);
    });

    it("should handle circular aliases gracefully", () => {
      const registry = createCommandRegistry();

      const proc = query({
        args: z.object({}),
        handler: async () => success("value"),
      });

      registry.register("proc", proc);
      registry.alias("proc", "alias1");
      registry.alias("alias1", "proc"); // Circular

      // Should not infinite loop
      expect(registry.resolve("alias1")).toBe("proc");
    });
  });
});
