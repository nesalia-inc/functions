import z from "zod";
import { MutationDefinition, QueryDefinition } from "../context";
import { AsyncResult } from "../types";

type InferOperationFn<T> = T extends
  | QueryDefinition<any, infer TArgs, infer TOutput, infer TError>
  | MutationDefinition<any, infer TArgs, infer TOutput, infer TError>
  ? (input: z.input<TArgs>) => AsyncResult<TOutput, TError>
  : never;

export type ApiRouter<T> = {
  [K in keyof T]: T[K] extends
    | QueryDefinition<any, any, any, any>
    | MutationDefinition<any, any, any, any>
    ? InferOperationFn<T[K]>
    : T[K] extends Record<string, any>
      ? ApiRouter<T[K]>
      : never;
};
