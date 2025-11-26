// extensions/index.ts
import { z, ZodType } from "zod";
import { InferOptions } from "./types";
// Retirez l'import de Extension et FunctionsForContext s'ils ne servent qu'au typage de retour

export function extensions<
  TSchema extends ZodType | undefined = undefined,
  TContextAddon extends Record<string, unknown> = Record<string, unknown>,
  // On enlève la contrainte pour laisser passer le type exact
  TFunctionsFactory = any
>(
  config: {
    name: string;
    schema?: TSchema;
    context?: (options: InferOptions<TSchema>) => TContextAddon;
    functions: (options: InferOptions<TSchema>) => TFunctionsFactory;
  },
) { 
  // SUPPRESSION DU TYPE DE RETOUR EXPLICITE ": Extension<...>"
  // C'est ça qui causait le "unknown". On laisse TS inférer le type réel.
  
  return (...args: any[]) => {
    const optionsInput = args[0];
    const options = (
      config.schema ? config.schema.parse(optionsInput) : undefined
    ) as InferOptions<TSchema>;

    const contextPart = config.context ? config.context(options) : ({} as TContextAddon);
    const functionsBuilder = config.functions(options);

    return {
      context: contextPart,
      functions: functionsBuilder,
    };
  };
}