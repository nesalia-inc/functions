import z, { ZodType } from "zod";
import { Exception } from "../errors/types";
import { AsyncResult, failure } from "../types";
import { HKT } from "../utils/hkt";
import { extension, withKind } from ".";
import { parseArgs } from "../functions/parse";

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

export const rpc = withKind<MutationHKT>()(
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