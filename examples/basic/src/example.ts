import z, { ZodType } from "zod";

// ==========================================
// 1. TYPES UTILITAIRES & CORE
// ==========================================

// Fusionne une union de types en une intersection
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I,
) => void
  ? I
  : never;

export type Unit = typeof unit;
export const unit = Symbol("unit");

export type AsyncResult<T, E> = Promise<
  { ok: true; value: T } | { ok: false; error: E }
>;

export const success = <T>(value: T): { ok: true; value: T } => ({
  ok: true,
  value,
});

// --- Structure de l'API ---
export type QueryDefinition<C, Args, Out, Err> = {
  _type: "query";
  args: ZodType<Args>;
  handler: (ctx: C, args: Args) => AsyncResult<Out, Err>;
};

export type MutationDefinition<C, Args, Out, Err> = {
  _type: "mutation";
  args: ZodType<Args>;
  handler: (ctx: C, args: Args) => AsyncResult<Out, Err>;
};

export type APINode<C = any> =
  | QueryDefinition<C, any, any, any>
  | MutationDefinition<C, any, any, any>
  | { [key: string]: APINode<C> };

// Type Guard
function isDefinition(
  node: APINode,
): node is
  | QueryDefinition<any, any, any, any>
  | MutationDefinition<any, any, any, any> {
  return (
    "_type" in node && (node._type === "query" || node._type === "mutation")
  );
}

// ==========================================
// 2. CONTEXT & EXTENSIONS BUILDER
// ==========================================

export const extensions = <T>(config: T) => config;

export function defineContext<Ctx>() {
  return {
    context: {} as Ctx,

    withExtensions: <
      E extends {
        functions: (opts: any) => (ctx: Ctx) => Record<string, unknown>;
      }[],
    >(options: { extensions: E }) => {
      // --- Runtime: build merged methods from extensions ---
      const mergedRuntimeBuilders = options.extensions.reduce(
        (acc, ext) => ({
          ...acc,
          ...(ext.functions({})(null as any) as Record<string, unknown>),
        }),
        {} as Record<string, unknown>,
      );

      // --- Type-level: merge methods from extensions ---
      type ExtensionFactory = E[number]["functions"];
      type ExtensionCurried = ExtensionFactory extends (...args: any) => infer R
        ? R
        : never;
      type ExtensionMethods = ExtensionCurried extends (...args: any) => infer M
        ? M
        : never;
      type RawMergedMethods = UnionToIntersection<ExtensionMethods>;

      // --- Build final runtime object (safe spread) ---
      const runtimeT = {
        context: {} as Ctx,
        ...(mergedRuntimeBuilders as Record<string, unknown>),
      };

      return runtimeT as { context: Ctx } & RawMergedMethods;
    },
  };
}

// ==========================================
// 3. EXTENSION RPC
// ==========================================

export const rpc = <Ctx>() =>
  extensions({
    name: "rpc",
    functions: (_options: any) => (context: Ctx) => ({
      query: <
        TArgs extends ZodType<any, any, any>,
        TOutput,
        TError
      >(options: {
        args: TArgs;
        handler: (ctx: Ctx, args: z.infer<TArgs>) => AsyncResult<TOutput, TError>;
      }): QueryDefinition<Ctx, z.infer<TArgs>, TOutput, TError> => ({
        _type: "query",
        args: options.args,
        handler: options.handler,
      }),

      mutation: <
        TArgs extends ZodType<any, any, any>,
        TOutput,
        TError
      >(options: {
        args: TArgs;
        handler: (ctx: Ctx, args: z.infer<TArgs>) => AsyncResult<TOutput, TError>;
      }): MutationDefinition<Ctx, z.infer<TArgs>, TOutput, TError> => ({
        _type: "mutation",
        args: options.args,
        handler: options.handler,
      }),

      group: <T extends Record<string, APINode<Ctx>>>(defs: T): T => defs,
    }),
  });

const loggingExtension = <Ctx>() =>
  extensions({
    name: "logging",
    functions: (_opts: any) => (ctx: typeof contextData) => ({
      log: (msg: string) => console.log(`[${ctx.user.email}]`, msg),
    }),
  });

// ==========================================
// 4. RUNTIME (createAPI)
// ==========================================

type ClientMapper<T> =
  T extends QueryDefinition<any, infer A, infer O, any>
    ? (args: A) => Promise<{ ok: true; value: O } | { ok: false; error: any }>
    : T extends MutationDefinition<any, infer A, infer O, any>
      ? (args: A) => Promise<{ ok: true; value: O } | { ok: false; error: any }>
      : T extends object
        ? { [K in keyof T]: ClientMapper<T[K]> }
        : never;

export function createAPI<Ctx, Root extends Record<string, APINode<Ctx>>>(options: {
  context: Ctx;
  root: Root;
  runtimeContext: Ctx;
}): ClientMapper<Root> {
  const buildProxy = (node: APINode<Ctx>): any => {
    if (isDefinition(node)) {
      return async (args: any) => {
        const parsedArgs = node.args.parse(args);
        return node.handler(options.runtimeContext, parsedArgs);
      };
    } else {
      const group: any = {};
      for (const key in node) {
        group[key] = buildProxy(node[key]);
      }
      return group;
    }
  };
  return buildProxy(options.root);
}

// ==========================================
// 5. EXEMPLE UTILISATEUR
// ==========================================

const contextData = {
  user: { id: "123", email: "admin@deesse.art" },
  db: {
    challenges: { create: (d: any) => console.log("DB Insert:", d) },
  },
};

export const t = defineContext<typeof contextData>().withExtensions({
  extensions: [rpc(), loggingExtension()],
});

const getChallenge = t.query({
  args: z.object({ challengeId: z.number() }),
  handler: async (ctx, args) => {
    return success({ id: args.challengeId, requestedBy: ctx.user.email });
  },
});

const createChallenge = t.mutation({
  args: z.object({ name: z.string() }),
  handler: async (ctx, args) => {
    ctx.db.challenges.create(args);
    return success(unit);
  },
});

const challengeGroup = t.group({ getChallenge, createChallenge });

const api = createAPI({
  context: t.context,
  root: { challenges: challengeGroup },
  runtimeContext: contextData,
});


async function main() {
  const result = await api.challenges.getChallenge({ challengeId: 1234 });
  console.log(await api.challenges.createChallenge({ name: "Example" }));
  console.log("Résultat:", result);
}

main();
