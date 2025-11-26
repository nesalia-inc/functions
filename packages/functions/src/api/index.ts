import { CommandsDefinition } from "../context/types";

import { exception } from "../errors";
import { parseArgs } from "../functions/parse";
import { failure } from "../types";
import { ApiRouter } from "./types";

export function createAPI<
  TCtx extends Record<string, unknown>,
  TRoot extends Record<string, any>,
>(config: { context: TCtx; root: TRoot }): ApiRouter<TRoot> {
  const hydrate = (node: any): any => {
    if (
      node &&
      typeof node === "object" &&
      (node._type === "query" || node._type === "mutation")
    ) {
      const def = node as CommandsDefinition;

      return (input: any) => {
        const parsed = parseArgs(def.args, input);

        return parsed.match({
          onSuccess: (data) => {
            return def.handler(data, config.context);
          },
          onFailure: (error) => {
            const ValidationError = exception({
              name: "ValidationError",
              message: error.message,
            });
            return Promise.resolve(failure(ValidationError));
          },
        });
      };
    }

    if (node && typeof node === "object") {
      const group: any = {};
      for (const key in node) {
        group[key] = hydrate(node[key]);
      }
      return group;
    }

    return node;
  };

  return hydrate(config.root);
}
