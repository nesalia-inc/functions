// types.ts
import z, { ZodType } from "zod";

/**
 * Maintenant que F est une fonction générique "propre" (grâce à l'étape 1),
 * l'inférence directe fonctionne parfaitement.
 * TS va voir : <C>(c: C) => ... extends (c: TContext) => infer R
 * Il va mathématiquement remplacer C par TContext.
 */
type ApplyContext<F, C> = F extends (context: C) => infer R ? R : never;

export type MergeExtensions<
  TContext,
  TExtensions extends readonly any[],
> = TExtensions extends readonly [infer Head, ...infer Tail]
  ? (Head extends { functions: infer F }
      ? ApplyContext<F, TContext>
      : {}) &
      MergeExtensions<TContext, Tail>
  : {};

// ExtensionBase devient un simple conteneur 'any' pour le runtime
export type ExtensionBase = {
  context: any;
  functions: any;
};

// ... InferOptions ...
export type InferOptions<T extends ZodType | undefined> = T extends ZodType
  ? z.infer<T>
  : undefined;