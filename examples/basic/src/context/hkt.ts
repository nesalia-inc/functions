import { z, ZodType } from "zod";

// =============================================================================
// PARTIE 1 : LE FRAMEWORK (LIBRARY CODE)
// =============================================================================

// --- HKT ENGINE ---
export interface HKT {
  readonly _C: unknown;
  readonly new: unknown;
}

type Apply<F extends HKT, C> = (F & { readonly _C: C })["new"];

// --- BASE UTILS ---
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never;

type AsyncResult<T, E> = Promise<
  { ok: true; data: T } | { ok: false; error: E }
>;

const success = <T>(data: T) => ({ ok: true as const, data });
const failure = <E>(error: E) => ({ ok: false as const, error });

type Exception = Error;
const exception = (obj: { name: string; message: string }) => new Error(obj.message);

const parseArgs = (schema: any, input: any) => ({
  match: (cbs: { onSuccess: (d: any) => any; onFailure: (e: any) => any }) => {
    try {
      return cbs.onSuccess(schema.parse(input));
    } catch (e: any) {
      return cbs.onFailure(e);
    }
  },
});

// --- EXTENSION SYSTEM ---

type ExtensionConfig = {
  name: string;
  init?: () => any;
  request?: (state: any, ctx: any) => any;
  functions?: <C>() => any;
};

// 1. HKT par défaut
interface DefaultHKT extends HKT {
  readonly new: {};
}

// 2. Wrapper Type
type ExtensionWithHKT<Kind extends HKT> = ExtensionConfig & {
  readonly _HKT: Kind;
};

// 3. Helper 'extension'
const extension = <const C extends ExtensionConfig>(config: C) =>
  config as C & { readonly _HKT: DefaultHKT };

// 4. Helper 'withKind'
const withKind = <Kind extends HKT>() => <Config extends ExtensionConfig>(
  config: Config
) => config as Config & { readonly _HKT: Kind };

// Extracteurs
type ExtractContext<T> = T extends { request: (...args: any) => infer R } ? Awaited<R> : {};

// ✅ Extraction HKT sécurisée
type GetHKT<T> = T extends { _HKT: infer K } 
  ? (K extends HKT ? K : DefaultHKT) 
  : DefaultHKT;


// --- CORE RUNTIME ---

type TransformAPI<T> = T extends (ctxProvider: any) => infer Func
  ? Func
  : T extends object
  ? { [K in keyof T]: TransformAPI<T[K]> }
  : T;

// ✅ Fusion Récursive (Fix ts 2589)
type MergeAPIs<Exts extends readonly any[], Ctx> = 
  Exts extends readonly [infer Head, ...infer Tail]
    ? Apply<GetHKT<Head>, Ctx> & MergeAPIs<Tail, Ctx>
    : {};

const defineContext = <const InitCtx = {}>(defaultContext: InitCtx = {} as any) => ({
  
  withExtensions: <const Exts extends readonly ExtensionWithHKT<any>[]>(
    extensions: Exts
  ) => {
    
    // 1. Contexte Final
    type FinalCtx = InitCtx &
      UnionToIntersection<ExtractContext<Exts[number]>>;

    // 2. API via Tuple Merge (Optimisé)
    type T_API = MergeAPIs<Exts, FinalCtx> & {
      router: <R>(routes: R) => R;
    };

    // --- Runtime t ---
    const t = extensions.reduce(
      (acc, ext) => ({ 
          ...acc, 
          ...(ext.functions ? ext.functions() : {}) 
      }),
      { router: (r: any) => r }
    ) as T_API;

    // --- Runtime createAPI ---
    const createAPI = <Root>(options: {
      root: Root;
      context?: InitCtx | (() => Promise<InitCtx> | InitCtx);
    }): TransformAPI<Root> => {
      
      const states = new Map();
      extensions.forEach((e) => e.init && states.set(e.name, e.init()));

      const getContext = async () => {
        let base: any = defaultContext;
        if (options.context) {
          base = typeof options.context === 'function' 
            ? await (options.context as Function)() 
            : options.context;
        }

        let ctx = { ...base };
        for (const ext of extensions) {
          if (ext.request) {
            const part = await ext.request(states.get(ext.name), ctx);
            ctx = { ...ctx, ...part };
          }
        }
        return ctx;
      };

      const activate = (node: any): any => {
        if (typeof node === "function") return node(getContext);
        if (typeof node === "object" && node !== null) {
          const res: any = {};
          for (const k in node) res[k] = activate(node[k]);
          return res;
        }
        return node;
      };

      return activate(options.root);
    };

    return { t, createAPI };
  },
});


// =============================================================================
// PARTIE 2 : EXTENSIONS (USER LAND)
// =============================================================================

// --- A. CORE EXTENSION ---

type CoreAPI<C> = {
  mutation: <
    TArgs extends ZodType<any, any, any>,
    TOutput,
    TError extends Exception
  >(options: {
    args: TArgs;
    handler: (ctx: C, args: z.infer<TArgs>) => AsyncResult<TOutput, TError>;
  }) => (
    contextProvider: () => Promise<C>
  ) => (input: z.input<TArgs>) => AsyncResult<TOutput, TError>;
};

interface MutationHKT extends HKT {
  new: CoreAPI<this["_C"]>;
}

const coreExt = withKind<MutationHKT>()(
  extension({
    name: "core",
    functions: <C>() => ({
      mutation: (options: any) => (contextProvider: () => Promise<C>) => async (input: any) => {
          const parsed = parseArgs(options.args, input);
          return parsed.match({
            onSuccess: async (data: any) => {
              const ctx = await contextProvider();
              return options.handler(ctx, data);
            },
            onFailure: (error: Exception) => Promise.resolve(failure(error)),
          });
        },
    }),
  })
);

// --- B. CACHE EXTENSION ---

type CacheStore = Map<string, any>;

const cacheExt = extension({
  name: "cache",
  init: (): CacheStore => new Map(),
  request: (store: CacheStore) => ({ 
      cache: {
          get: (k: string) => store.get(k),
          set: (k: string, v: any) => store.set(k, v)
      } 
  }),
});


// =============================================================================
// PARTIE 3 : APPLICATION
// =============================================================================

const context = { userId: "123" };

const { t, createAPI } = defineContext(context).withExtensions([
  coreExt,
  cacheExt, 
]);

// Définition
const createUser = t.mutation({
  args: z.object({ name: z.string() }),
  handler: async (ctx, args) => {
    // ✅ Autocomplétion OK
    ctx.cache.set(`user:${args.name}`, { id: 1 });
    return success({ id: 1, name: args.name });
  },
});

// API
const api = createAPI({
  root: t.router({ createUser }),
});

// Run
const run = async () => {
  const res = await api.createUser({ name: "Alice" });
  console.log("Result:", res);
};

run();