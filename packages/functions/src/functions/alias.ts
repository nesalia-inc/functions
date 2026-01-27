import { z, ZodType } from "zod";
import { RunnableProcedure } from "./lifecycle";

/**
 * Creates an alias for a query or mutation with a different name
 *
 * @param procedure - The original query/mutation procedure
 * @param aliasName - The alias name
 * @returns The same procedure with an additional alias property
 *
 * @example
 * ```ts
 * const getUser = query({
 *   args: z.object({ id: z.number() }),
 *   handler: async (args, ctx) => success({ id: args.id }),
 * });
 *
 * const fetchUser = alias(getUser, "fetchUser");
 * // Both can be used, but they refer to the same underlying procedure
 * ```
 */
export function alias<
  TArgs extends ZodType<any, any, any>,
  TContext = any,
  TOutput = any,
  TError = any
>(
  procedure: RunnableProcedure<TArgs, TContext, TOutput, TError>,
  aliasName: string
): RunnableProcedure<TArgs, TContext, TOutput, TError> {
  // Add the alias as a property
  (procedure as any)[aliasName] = procedure;
  return procedure;
}

/**
 * Creates multiple aliases for a query or mutation
 *
 * @param procedure - The original query/mutation procedure
 * @param aliases - Array of alias names
 * @returns The procedure with all aliases attached
 *
 * @example
 * ```ts
 * const getUser = query({
 *   args: z.object({ id: z.number() }),
 *   handler: async (args, ctx) => success({ id: args.id }),
 * });
 *
 * const aliased = aliases(getUser, ["fetchUser", "retrieveUser", "getUserById"]);
 * // All of these now work: fetchUser(), retrieveUser(), getUserById()
 * ```
 */
export function aliases<
  TArgs extends ZodType<any, any, any>,
  TContext = any,
  TOutput = any,
  TError = any
>(
  procedure: RunnableProcedure<TArgs, TContext, TOutput, TError>,
  aliasNames: string[]
): RunnableProcedure<TArgs, TContext, TOutput, TError> {
  aliasNames.forEach((aliasName) => {
    (procedure as any)[aliasName] = procedure;
  });
  return procedure;
}

/**
 * Creates a grouped API with named procedures and their aliases
 *
 * @param procedures - Object mapping names to procedures
 * @returns An object with all procedures and their aliases
 *
 * @example
 * ```ts
 * const getUser = query({
 *   args: z.object({ id: z.number() }),
 *   handler: async (args, ctx) => success({ id: args.id }),
 * });
 *
 * const createUser = mutation({
 *   args: z.object({ name: z.string() }),
 *   handler: async (args, ctx) => success({ id: 1, ...args }),
 * });
 *
 * const api = createAPI({
 *   root: withAliases({
 *     getUser,
 *     fetchUser: alias(getUser, "getUser"),
 *     createUser,
 *     registerUser: alias(createUser, "createUser"),
 *   }),
 * });
 * ```
 */
export function withAliases<T extends Record<string, RunnableProcedure>>(
  procedures: T
): T & { [K in string]: RunnableProcedure } {
  const result: any = { ...procedures };

  // Process each procedure to attach its aliases
  Object.entries(procedures).forEach(([name, procedure]) => {
    // Check if the procedure has an _aliases property (set by alias/aliases functions)
    if ((procedure as any)._aliases) {
      (procedure as any)._aliases.forEach((aliasName: string) => {
        result[aliasName] = procedure;
      });
    }
  });

  return result;
}

/**
 * Creates a command registry that tracks all commands and their aliases
 *
 * @example
 * ```ts
 * const registry = createCommandRegistry();
 *
 * const getUser = query({
 *   args: z.object({ id: z.number() }),
 *   handler: async (args, ctx) => success({ id: args.id }),
 * });
 *
 * registry.register("getUser", getUser);
 * registry.alias("getUser", "fetchUser");
 * registry.alias("getUser", "retrieveUser");
 *
 * registry.has("getUser"); // true
 * registry.has("fetchUser"); // true
 * registry.resolve("fetchUser"); // returns the getUser procedure
 * registry.getAliases("getUser"); // ["getUser", "fetchUser", "retrieveUser"]
 * ```
 */
export function createCommandRegistry() {
  const commands = new Map<string, RunnableProcedure>();
  const aliases = new Map<string, Set<string>>();

  return {
    /**
     * Register a command
     */
    register(name: string, procedure: RunnableProcedure): void {
      commands.set(name, procedure);
      if (!aliases.has(name)) {
        aliases.set(name, new Set([name]));
      }
    },

    /**
     * Add an alias to a command
     */
    alias(commandName: string, aliasName: string): void {
      const procedure = commands.get(commandName);
      if (!procedure) {
        throw new Error(`Command '${commandName}' not found`);
      }

      commands.set(aliasName, procedure);
      aliases.get(commandName)!.add(aliasName);

      // Also add the alias to its own set for reverse lookup
      if (!aliases.has(aliasName)) {
        aliases.set(aliasName, new Set());
      }
      aliases.get(aliasName)!.add(commandName);
    },

    /**
     * Check if a command or alias exists
     */
    has(name: string): boolean {
      return commands.has(name);
    },

    /**
     * Resolve an alias to its primary command name
     */
    resolve(aliasName: string): string | undefined {
      const primaryAliases = aliases.get(aliasName);
      if (primaryAliases && primaryAliases.size > 0) {
        // Return the first alias that's not the name itself
        for (const alias of primaryAliases) {
          if (alias !== aliasName) {
            return alias;
          }
        }
      }
      return undefined;
    },

    /**
     * Get a command by name or alias
     */
    get(name: string): RunnableProcedure | undefined {
      return commands.get(name);
    },

    /**
     * Get all aliases for a command
     */
    getAliases(commandName: string): string[] {
      const commandAliases = aliases.get(commandName);
      return commandAliases ? Array.from(commandAliases) : [];
    },

    /**
     * Get all registered command names (including aliases)
     */
    getAllNames(): string[] {
      return Array.from(commands.keys());
    },

    /**
     * Get all primary command names (excluding aliases)
     */
    getCommandNames(): string[] {
      const primaryNames = new Set<string>();
      for (const [name, aliasSet] of aliases.entries()) {
        // If this is the primary name (it's in its own alias set first)
        if (aliasSet.has(name) && Array.from(aliasSet)[0] === name) {
          primaryNames.add(name);
        }
      }
      return Array.from(primaryNames);
    },

    /**
     * Remove a command and all its aliases
     */
    unregister(commandName: string): void {
      const commandAliases = aliases.get(commandName);
      if (commandAliases) {
        commandAliases.forEach((alias) => {
          commands.delete(alias);
          aliases.delete(alias);
        });
      }
    },

    /**
     * Clear all commands
     */
    clear(): void {
      commands.clear();
      aliases.clear();
    },

    /**
     * Get registry statistics
     */
    getStats() {
      return {
        totalCommands: commands.size,
        primaryCommands: this.getCommandNames().length,
        totalAliases: commands.size - this.getCommandNames().length,
      };
    },
  };
}

/**
 * Type for a command registry instance
 */
export type CommandRegistry = ReturnType<typeof createCommandRegistry>;
