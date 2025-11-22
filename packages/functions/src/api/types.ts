import z, { ZodType } from "zod";
import { QueryDefinition } from "../context/define";
import { AsyncResult } from "../types";

type InferQueryFn<T> =
  T extends QueryDefinition<
    any, 
    infer TArgs extends ZodType<any, any, any>,
    infer TOutput,
    infer TError 
  >
    ? (input: z.input<TArgs>) => AsyncResult<TOutput, TError>
    : never;

export type ApiRouter<T> = {
  [K in keyof T]: T[K] extends QueryDefinition<any, any, any, any>
    ? InferQueryFn<T[K]>
    : T[K] extends Record<string, any>
      ? ApiRouter<T[K]>
      : never;
};