// types.ts
import z, { ZodType } from "zod";
import { Apply, HKT } from "../utils/hkt";

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




export type ExtensionConfig = {
  name: string;
  init?: () => any;
  request?: (state: any, ctx: any) => any;
  functions?: <C>() => any;
};

// 1. HKT par défaut
export interface DefaultHKT extends HKT {
  readonly new: {};
}


export type ExtensionWithHKT<Kind extends HKT> = ExtensionConfig & {
  readonly _HKT: Kind;
};

// Extracteurs
export type ExtractContext<T> = T extends { request: (...args: any) => infer R } ? Awaited<R> : {};

// ✅ Extraction HKT sécurisée
export type GetHKT<T> = T extends { _HKT: infer K }
  ? (K extends HKT ? K : DefaultHKT)
  : DefaultHKT;


// --- CORE RUNTIME ---

export type TransformAPI<T> = T extends (ctxProvider: any) => infer Func
  ? Func
  : T extends object
  ? { [K in keyof T]: TransformAPI<T[K]> }
  : T;

// ✅ Fusion Récursive (Fix ts 2589)
export type MergeAPIs<Exts extends readonly any[], Ctx> =
  Exts extends readonly [infer Head, ...infer Tail]
  ? Apply<GetHKT<Head>, Ctx> & MergeAPIs<Tail, Ctx>
  : {};