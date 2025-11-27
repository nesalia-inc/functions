import { HKT } from "../utils/hkt";
import { DefaultHKT, ExtensionConfig } from "./types";

export const extension = <const C extends ExtensionConfig>(config: C) =>
  config as C & { readonly _HKT: DefaultHKT };

// 4. Helper 'withKind'
export const withKind = <Kind extends HKT>() => <Config extends ExtensionConfig>(
  config: Config
) => config as Config & { readonly _HKT: Kind };