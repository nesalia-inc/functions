import { z, ZodType } from "zod";
import { exception } from "../errors";
import { Exception } from "../errors/types";
import { AsyncResult, failure, success } from "../types";
import { parseArgs } from "./parse";
import { getContext } from "../context";
import { Context } from "../context/types";

// Query finale
export function query<
  TArgs extends ZodType<any, any, any>,
  TOutput,
  TError extends Exception = Exception,
>(options: {
  args: TArgs;
  handler: (args: z.infer<TArgs>, ctx: Context) => AsyncResult<TOutput, TError>;
}) {
  type Input = z.infer<TArgs>;

  return (input: Input): AsyncResult<TOutput, TError> => {
    const parsed = parseArgs(options.args, input);

    return parsed.match({
      onSuccess: (data: Input) => {
        const ctx = getContext();
        return options.handler(data, ctx);
      },
      onFailure: (error: Exception) => {
        const ValidationError = exception({
          name: "ValidationError",
          message: error.message,
        }) as TError;

        return Promise.resolve(failure(ValidationError));
      },
    });
  };
}


