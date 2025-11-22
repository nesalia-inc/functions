import { z, ZodType } from "zod";
import { Exception } from "../errors/types";
import { AsyncResult, Unit } from "../types";

export type Command = {
  beforeInvoke: () => Promise<void>;
  afterInvoke: () => Promise<void>;
  onSuccess: () => Promise<void>;
  onError: (config: { exception: Exception }) => Promise<void>;
};

export type CommandGroupConfig = {
  name: string;
  children: readonly (Command | CommandGroupConfig)[];
};

export type IsGroup<T> = T extends {
  name: string;
  children: readonly (Command | CommandGroupConfig)[];
}
  ? T
  : never;

export type GroupFromConfig<C extends CommandGroupConfig> = { name: C["name"] } & {
  [K in Extract<
    C["children"][number],
    CommandGroupConfig
  > as K["name"]]: GroupFromConfig<K>;
};

export type Query<
  TArgs extends ZodType = ZodType,
  TError extends Exception = Exception,
  TOutput = Unit,
  TContext = {},
> = (options: {
  name: string;
  args: TArgs;
  handler: (
    args: z.infer<TArgs>,
    ctx: TContext,
  ) => AsyncResult<TOutput, TError>;
}) => (args: z.infer<TArgs>, ctx: TContext) => AsyncResult<TOutput, TError>;

export type Mutation<
  TArgs extends ZodType = ZodType,
  TError extends Exception = Exception,
  TOutput = Unit,
> = (options: {
  args: TArgs;
  handler: (args: z.infer<TArgs>) => AsyncResult<TOutput, TError>;
}) => (args: z.infer<TArgs>) => AsyncResult<TOutput, TError>;