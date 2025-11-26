import { z, ZodType } from "zod";

// ==========================================
// 1. TYPES & UTILITAIRES
// ==========================================

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

// ==========================================
// 2. EXTENSIONS
// ==========================================

const extension = <
  const Config extends {
    name: string;
    init?: () => any;
    request?: (state: any, ctx: any) => any;
    functions: <C>() => any;
  }
>(config: Config) => config;

type InferExtension = ReturnType<typeof extension>;
type ExtractContext<T> = T extends { request: (...args: any) => infer R } ? Awaited<R> : {};
type ExtractBuilders<T> = T extends { functions: () => infer R } ? R : {};

// ==========================================
// 3. CORE (Modifié pour capturer la valeur par défaut)
// ==========================================

type TransformAPI<T> = T extends (ctxProvider: any) => infer Func
  ? Func
  : T extends object
  ? { [K in keyof T]: TransformAPI<T[K]> }
  : T;

type ContextAwareBuilder<RawB, FinalCtx> = {
  [K in keyof RawB]: RawB[K] extends (options: any) => any
    ? Parameters<RawB[K]>[0] extends { handler: any }
      ? <Args extends ZodType, Out, Err>(
          options: {
            args: Args;
            handler: (ctx: FinalCtx, args: z.infer<Args>) => AsyncResult<Out, Err>;
          } & Omit<Parameters<RawB[K]>[0], "args" | "handler">
        ) => (contextProvider: () => Promise<FinalCtx>) => (input: z.input<Args>) => AsyncResult<Out, Err>
      : RawB[K]
    : RawB[K];
};

// MODIFICATION 1 : On capture 'defaultContext'
const defineContext = <const InitCtx = {}>(defaultContext: InitCtx = {} as any) => ({
  
  withExtensions: <const Exts extends readonly InferExtension[]>(extensions: Exts) => {
    type ExtCtxs = UnionToIntersection<ExtractContext<Exts[number]>>;
    type FinalCtx = InitCtx & ExtCtxs;
    type RawBuilders = UnionToIntersection<ExtractBuilders<Exts[number]>>;
    
    type T_API = ContextAwareBuilder<RawBuilders, FinalCtx> & {
      router: <R>(routes: R) => R;
    };

    const t = extensions.reduce(
      (acc, ext) => ({ ...acc, ...ext.functions() }),
      { router: (r: any) => r }
    ) as T_API;

    // MODIFICATION 2 : L'option 'context' est maintenant optionnelle (?)
    const createAPI = <Root>(options: {
      root: Root;
      context?: InitCtx | (() => Promise<InitCtx> | InitCtx); 
    }): TransformAPI<Root> => {
      
      const states = new Map();
      extensions.forEach((e) => e.init && states.set(e.name, e.init()));

      const getContext = async () => {
        // LOGIQUE DE PRIORITÉ :
        // 1. Si createAPI fournit un contexte, on l'utilise (Override)
        // 2. Sinon, on utilise le defaultContext stocké dans defineContext
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

// ==========================================
// 4. IMPLEMENTATION EXTENSIONS
// ==========================================

const coreExt = extension({
  name: "core",
  functions: <C>() => ({
    mutation: <TArgs extends ZodType<any, any, any>, TOutput, TError extends Exception>(options: {
      args: TArgs;
      handler: (ctx: C, args: z.infer<TArgs>) => AsyncResult<TOutput, TError>;
    }) => (contextProvider: () => Promise<C>) => async (input: z.input<TArgs>): AsyncResult<TOutput, TError> => {
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
});

type EventBus = { emit: (msg: string) => void };
const eventsExt = extension({
  name: "events",
  init: (): EventBus => ({ emit: (msg: string) => console.log(`[EVENT] ${msg}`) }),
  request: (bus: EventBus) => ({ events: bus }),
  functions: <C>() => ({ on: () => {} }),
});

// ==========================================
// 5. UTILISATION OPTIMISÉE
// ==========================================

const context = { userId: "123" };

// 1. On donne le contexte ici (Valeur + Type)
const { t, createAPI } = defineContext(context).withExtensions([
  coreExt,
  eventsExt,
]);

// 2. Définition
const createUser = t.mutation({
  args: z.object({ name: z.string() }),
  handler: async (ctx, args) => {
    // ✅ Fonctionne toujours
    console.log(`User ID: ${ctx.userId}`); 
    return success({ id: 1, name: args.name });
  },
});

// 3. Création API
// ✅ PLUS BESOIN de passer context ici ! Il utilise celui de defineContext
const api = createAPI({
  root: t.router({ createUser }),
});

// 4. Exécution
api.createUser({ name: "Alice" });


// 5. CAS AVANCÉ : OVERRIDE
// Si on est dans un serveur Web, on peut quand même écraser le contexte
/*
const serverApi = createAPI({
    root: t.router({ createUser }),
    context: () => ({ userId: "dynamic_id_from_request" })
})
*/