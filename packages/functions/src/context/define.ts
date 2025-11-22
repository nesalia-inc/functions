import z, { ZodType } from "zod";
import { Exception } from "../errors/types";
import { AsyncResult } from "../types";

export type QueryDefinition<
  TContext,
  TArgs extends ZodType,
  TOutput,
  TError extends Exception,
> = {
  _type: "query";
  name: string;
  args: TArgs;
  handler: (
    args: z.infer<TArgs>,
    ctx: TContext,
  ) => AsyncResult<TOutput, TError>;
};

export type APINode = QueryDefinition<any, any, any, any> | { [key: string]: APINode };

export function defineContext<TContext extends Record<string, unknown>>() {
  return {
    query: <
      TArgs extends ZodType<any, any, any>,
      TOutput,
      TError extends Exception = Exception,
    >(options: {
      name: string;
      args: TArgs;
      handler: (
        args: z.infer<TArgs>,
        ctx: TContext,
      ) => AsyncResult<TOutput, TError>;
    }): QueryDefinition<TContext, TArgs, TOutput, TError> => {
      return {
        _type: "query",
        name: options.name,
        args: options.args,
        handler: options.handler,
      };
    },
    group: <T extends Record<string, APINode>>(definitions: T) => {
      return definitions;
    },
  };
}



