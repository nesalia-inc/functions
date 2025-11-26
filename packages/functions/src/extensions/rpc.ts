import z, { ZodType } from "zod";
import { Exception } from "../errors/types";
import { AsyncResult } from "../types";
import {
  CommandsDefinition,
  MutationDefinition,
  QueryDefinition,
} from "../context/types";
import { extensions } from ".";

export type APINode = CommandsDefinition | { [key: string]: APINode };

export const rpc = extensions({
  name: "rpc",
  schema: undefined, // Pas d'options pour le moment
  context: undefined,

  // On garde une signature ultra-clean : <C>(context: C) => ...
  functions:
    (_options) =>
    <C>(context: C) => ({
      query: <
        TArgs extends ZodType<any, any, any>,
        TOutput,
        TError extends Exception
      >(options: {
        args: TArgs;
        handler: (
          ctx: C, // C sera ici { user: ... }
          args: z.infer<TArgs>
        ) => AsyncResult<TOutput, TError>;
      }): QueryDefinition<C, TArgs, TOutput, TError> => {
        return { _type: "query", ...options };
      },

      mutation: <
        TArgs extends ZodType<any, any, any>,
        TOutput,
        TError extends Exception
      >(options: {
        args: TArgs;
        handler: (
          ctx: C,
          args: z.infer<TArgs>
        ) => AsyncResult<TOutput, TError>;
      }): MutationDefinition<C, TArgs, TOutput, TError> => {
        return { _type: "mutation", ...options };
      },

      group: <T extends Record<string, APINode>>(definitions: T) => definitions,
    }),
});