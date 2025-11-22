import { z, ZodType } from "zod";
import { exception } from "../errors";
import { Exception } from "../errors/types";
import { AsyncResult, failure } from "../types";
import { parseArgs } from "./parse";

export function query<
  TArgs extends ZodType<any, any, any>,
  TOutput,
  TError extends Exception = Exception,
  TContext extends Record<string, unknown> = Record<string, unknown>,
>(options: {
  name: string;
  args: TArgs;
  handler: (
    args: z.infer<TArgs>,
    ctx: TContext,
  ) => AsyncResult<TOutput, TError>;
}) {
  type Input = z.infer<TArgs>;
  return (input: Input, context: TContext): AsyncResult<TOutput, TError> => {
    const parsed = parseArgs(options.args, input);
    return parsed.match({
      onSuccess: (data: Input) => {
        const ctx = context
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
