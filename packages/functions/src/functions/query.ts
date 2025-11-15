import { z, ZodType } from "zod";
import type { AppContext } from "../context/typing";
import { getTypedContext } from "../context/typing";
import { exception } from "../errors";
import { Exception } from "../errors/types";
import { AsyncResult, failure } from "../types";
import { parseArgs } from "./parse";

// Overload for context-aware queries
export function query<
  TArgs extends ZodType<any, any, any>,
  TOutput,
  TError extends Exception = Exception,
  TContext extends AppContext = AppContext,
>(options: {
  args: TArgs;
  handler: (args: z.infer<TArgs>, ctx: TContext) => AsyncResult<TOutput, TError>;
  contextName?: string;
}): (input: z.infer<TArgs>, context?: TContext) => AsyncResult<TOutput, TError>;

// Overload for queries without context
export function query<
  TArgs extends ZodType<any, any, any>,
  TOutput,
  TError extends Exception = Exception,
>(options: {
  args: TArgs;
  handler: (args: z.infer<TArgs>) => AsyncResult<TOutput, TError>;
}): (input: z.infer<TArgs>) => AsyncResult<TOutput, TError>;

// Implementation
export function query<
  TArgs extends ZodType<any, any, any>,
  TOutput,
  TError extends Exception = Exception,
  TContext extends AppContext = AppContext,
>(options: {
  args: TArgs;
  handler: (args: z.infer<TArgs>, ctx?: TContext) => AsyncResult<TOutput, TError>;
  contextName?: string;
}) {
  type Input = z.infer<TArgs>;
  return (input: Input, context?: TContext): AsyncResult<TOutput, TError> => {
    const parsed = parseArgs(options.args, input);
    return parsed.match({
      onSuccess: (data: Input) => {
        const ctx = context ?? getTypedContext<TContext>();
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

// Query builder
export const createQuery = <TContext extends AppContext = AppContext>() => {
  return <
    TArgs extends ZodType<any, any, any>,
    TOutput,
    TError extends Exception = Exception,
  >(options: {
    args: TArgs;
    handler: (args: z.infer<TArgs>, ctx: TContext) => AsyncResult<TOutput, TError>;
  }) => {
    return query<TArgs, TOutput, TError, TContext>(options);
  };
};