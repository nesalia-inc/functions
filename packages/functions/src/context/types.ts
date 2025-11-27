import z, { ZodType } from "zod";
import { Exception } from "../errors/types";
import { AsyncResult } from "../types";

export type Context = Record<string, unknown>;

export type CommandDefinition<
  TContext,
  TArgs extends ZodType,
  TOutput,
  TError extends Exception,
> = {
  args: TArgs;
  handler: (
    ctx: TContext,
    args: z.infer<TArgs>,
  ) => AsyncResult<TOutput, TError>;
};

export type QueryDefinition<
  TContext,
  TArgs extends ZodType,
  TOutput,
  TError extends Exception,
> = CommandDefinition<TContext, TArgs, TOutput, TError> & {
  _type: "query";
};

export type MutationDefinition<
  TContext,
  TArgs extends ZodType,
  TOutput,
  TError extends Exception,
> = CommandDefinition<TContext, TArgs, TOutput, TError> & {
  _type: "mutation";
};

export type CommandsDefinition =
  | QueryDefinition<any, any, any, any>
  | MutationDefinition<any, any, any, any>;


  