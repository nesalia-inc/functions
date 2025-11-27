import { ExtensionWithHKT, ExtractContext, MergeAPIs, TransformAPI } from "../extensions/types";
import { UnionToIntersection } from "../utils";

export const defineContext = <const InitCtx = {}>(defaultContext: InitCtx = {} as any) => ({

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
