import { z, ZodType } from "zod";
import { Exception } from "../errors/types";
import { Result, success, failure } from "../types";
import { exception } from "../errors";

/**
 * Type-safe query definition
 */
export interface QueryDefinition<C, Args, Output, Error extends Exception = Exception> {
  readonly _type: "query";
  readonly args: ZodType<Args>;
  readonly handler: (ctx: C, args: Args) => Promise<Result<Output, Error>>;
}

/**
 * Type-safe mutation definition
 */
export interface MutationDefinition<C, Args, Output, Error extends Exception = Exception> {
  readonly _type: "mutation";
  readonly args: ZodType<Args>;
  readonly handler: (ctx: C, args: Args) => Promise<Result<Output, Error>>;
}

/**
 * Simple extension without HKT complexity
 */
export interface NativeExtension<C> {
  /**
   * Extension name (for debugging)
   */
  name: string;

  /**
   * Add context at runtime
   */
  context?: (ctx: C) => Partial<C> | Promise<Partial<C>>;

  /**
   * Additional methods to add to the API
   */
  methods?: Record<string, (...args: any[]) => any>;
}

/**
 * API builder with query, mutation, and router methods
 * No HKT, no complex type magic - just straightforward TypeScript
 */
export type APIBuilder<C> = {
  /**
   * Creates a query endpoint for read-only operations
   *
   * @template Args - Input arguments type (inferred from Zod schema)
   * @template Output - Return type on success
   * @template Error - Exception type on failure
   * @param options - Query configuration
   * @returns A query definition
   */
  query: <
    Args extends ZodType<any, any, any>,
    Output,
    Error extends Exception = Exception
  >(
    options: {
      args: Args;
      handler: (ctx: C, args: z.infer<Args>) => Promise<Result<Output, Error>>;
    }
  ) => QueryDefinition<C, z.infer<Args>, Output, Error>;

  /**
   * Creates a mutation endpoint for write operations
   *
   * @template Args - Input arguments type (inferred from Zod schema)
   * @template Output - Return type on success
   * @template Error - Exception type on failure
   * @param options - Mutation configuration
   * @returns A mutation definition
   */
  mutation: <
    Args extends ZodType<any, any, any>,
    Output,
    Error extends Exception = Exception
  >(
    options: {
      args: Args;
      handler: (ctx: C, args: z.infer<Args>) => Promise<Result<Output, Error>>;
    }
  ) => MutationDefinition<C, z.infer<Args>, Output, Error>;

  /**
   * Groups endpoints together (organizational only, identity function)
   *
   * @template R - Routes object type
   * @param routes - Object containing endpoint definitions
   * @returns The same routes object (no transformation)
   */
  router: <R extends Record<string, any>>(routes: R) => R;
};

/**
 * Creates a context builder with query, mutation, and router methods
 *
 * The context is defined ONCE here, making it the single source of truth.
 * No need to pass context again in createAPI.
 *
 * @template C - Context type
 * @param context - The runtime context data (single source of truth)
 * @param extensions - Optional extensions to add
 * @returns Object with API builder (t) and createAPI function
 *
 * @example
 * ```ts
 * // Define context once with data
 * const { t, createAPI } = defineContext({
 *   userId: "user-123",
 *   database: myDatabase
 * });
 *
 * const getUser = t.query({
 *   args: z.object({ id: z.number() }),
 *   handler: async (ctx, args) => {  // ctx BEFORE args ✅
 *     return success({ id: args.id, requestedBy: ctx.userId });
 *   },
 * });
 *
 * const api = createAPI({ getUser });  // No context needed here! ✅
 * ```
 */
export function defineContext<C = {}>(
  context: C,
  extensions?: NativeExtension<C>[]
): {
  t: APIBuilder<C>;
  createAPI: <Root extends Record<string, any>>(root: Root) => Root;
} {
  return {
    /**
     * API builder object
     */
    t: {
      query: <
        Args extends ZodType<any, any, any>,
        Output,
        Error extends Exception = Exception
      >(
        definition: {
          args: Args;
          handler: (ctx: C, args: z.infer<Args>) => Promise<Result<Output, Error>>;
        }
      ): QueryDefinition<C, z.infer<Args>, Output, Error> => {
        return {
          _type: "query",
          args: definition.args,
          handler: definition.handler,
        } as any;
      },

      mutation: <
        Args extends ZodType<any, any, any>,
        Output,
        Error extends Exception = Exception
      >(
        definition: {
          args: Args;
          handler: (ctx: C, args: z.infer<Args>) => Promise<Result<Output, Error>>;
        }
      ): MutationDefinition<C, z.infer<Args>, Output, Error> => {
        return {
          _type: "mutation",
          args: definition.args,
          handler: definition.handler,
        } as any;
      },

      router: <R extends Record<string, any>>(routes: R): R => {
        return routes;
      },
    } as APIBuilder<C>,

    /**
     * Creates a runtime API from endpoint definitions
     * Context is already defined - no need to pass it again!
     *
     * @param root - Root object containing endpoints
     * @returns Activated API with context injected
     */
    createAPI: <Root extends Record<string, any>>(
      root: Root
    ): Root => {
      return activateAPI(root, context, extensions || []);
    },
  };
}

/**
 * Recursively activate API by injecting context into all functions
 */
function activateAPI<C>(
  node: any,
  context: C,
  extensions: NativeExtension<C>[]
): any {
  // Check if it's a query or mutation definition (these are objects with _type)
  if (node && typeof node === "object" && (node._type === "query" || node._type === "mutation")) {
    return async (input: any) => {
      // Parse and validate arguments
      const parsed = node.args.safeParse(input);
      if (!parsed.success) {
        return failure(
          exception({
            name: "ValidationError",
            message: parsed.error.message,
          })
        );
      }

      // Build full context with extensions
      let fullContext = { ...context };
      for (const ext of extensions) {
        if (ext.context) {
          const partial = await ext.context(fullContext as C);
          fullContext = { ...fullContext, ...partial };
        }
      }

      // Call handler with ctx BEFORE args
      return node.handler(fullContext, parsed.data);
    };
  }

  // If it's a function (but not a query/mutation), return as-is
  if (typeof node === "function") {
    return node;
  }

  // If it's an object, recursively activate its properties
  if (typeof node === "object" && node !== null) {
    const result: any = {};
    for (const key in node) {
      // Skip prototype properties
      if (!Object.prototype.hasOwnProperty.call(node, key)) continue;
      result[key] = activateAPI(node[key], context, extensions);
    }
    return result;
  }

  // Otherwise return as-is
  return node;
}
