// defineContext.ts
import { ExtensionBase, MergeExtensions } from "../extensions/types";

export function defineContext<TContext extends Record<string, any>>() {
  return {
    // any[] préserve la généricité de rpc jusqu'au bout
    withExtensions: <TExtensions extends readonly any[]>(config: {
      extensions: readonly [...TExtensions];
    }) => {
      const runtimeBuilder: any = {};
      const dummyContext = {} as TContext;

      for (const extension of config.extensions) {
        // Cast runtime uniquement
        const ext = extension as ExtensionBase;
        if (ext && typeof ext.functions === "function") {
          const extensionMethods = ext.functions(dummyContext);
          Object.assign(runtimeBuilder, extensionMethods);
        }
      }

      type Public = MergeExtensions<TContext, TExtensions> & {
        context: TContext;
      };

      return {
        ...runtimeBuilder,
        context: {} as TContext,
      } as Public;
    },
  };
}