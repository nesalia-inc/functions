export interface HKT {
    readonly _C: unknown;
    readonly new: unknown;
}

export type Apply<F extends HKT, C> = (F & { readonly _C: C })["new"];
