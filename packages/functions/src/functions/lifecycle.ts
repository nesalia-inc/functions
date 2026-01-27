import { z, ZodType } from "zod";
import { exception } from "../errors";
import { Exception } from "../errors/types";
import { AsyncResult, Result, failure, success } from "../types";
import { parseArgs } from "./parse";

/**
 * Lifecycle hooks for query and mutation procedures
 */
export type LifecycleHooks<
  TContext = any,
  TArgs = any,
  TOutput = any,
  TError extends Exception = Exception
> = {
  beforeInvoke?: (ctx: TContext, args: TArgs) => void | Promise<void>;
  afterInvoke?: (
    ctx: TContext,
    args: TArgs,
    result: AsyncResult<TOutput, TError>
  ) => void | Promise<void>;
  onSuccess?: (ctx: TContext, args: TArgs, data: TOutput) => void | Promise<void>;
  onError?: (ctx: TContext, args: TArgs, error: TError) => void | Promise<void>;
};

/**
 * A runnable procedure that is both callable and has lifecycle hook methods
 */
export type RunnableProcedure<
  TArgs = any,
  TContext = any,
  TOutput = any,
  TError extends Exception = Exception
> = {
  (ctx: TContext, input: TArgs): AsyncResult<TOutput, TError>;
} & {
  beforeInvoke<Args = TArgs>(
    fn: (ctx: TContext, args: Args) => void | Promise<void>
  ): RunnableProcedure<TArgs, TContext, TOutput, TError>;
  afterInvoke<Args = TArgs>(
    fn: (
      ctx: TContext,
      args: Args,
      result: AsyncResult<TOutput, TError>
    ) => void | Promise<void>
  ): RunnableProcedure<TArgs, TContext, TOutput, TError>;
  onSuccess<Data = TOutput, Args = TArgs>(
    fn: (ctx: TContext, args: Args, data: Data) => void | Promise<void>
  ): RunnableProcedure<TArgs, TContext, TOutput, TError>;
  onError<Err = TError, Args = TArgs>(
    fn: (ctx: TContext, args: Args, error: Err) => void | Promise<void>
  ): RunnableProcedure<TArgs, TContext, TOutput, TError>;
};

/**
 * Internal state for a runnable procedure
 */
interface ProcedureState<
  TContext,
  TArgs,
  TOutput,
  TError extends Exception
> {
  beforeInvokeHooks: Array<
    (ctx: TContext, args: TArgs) => void | Promise<void>
  >;
  afterInvokeHooks: Array<
    (
      ctx: TContext,
      args: TArgs,
      result: AsyncResult<TOutput, TError>
    ) => void | Promise<void>
  >;
  onSuccessHooks: Array<
    (ctx: TContext, args: TArgs, data: TOutput) => void | Promise<void>
  >;
  onErrorHooks: Array<
    (ctx: TContext, args: TArgs, error: TError) => void | Promise<void>
  >;
}

/**
 * Creates a query with lifecycle hooks support
 */
export function query<
  TArgs extends ZodType<any, any, any>,
  TOutput,
  TError extends Exception = Exception,
  TContext extends Record<string, unknown> = Record<string, unknown>
>(options: {
  name?: string;
  args: TArgs;
  handler: (
    ctx: TContext,
    args: z.infer<TArgs>
  ) => AsyncResult<TOutput, TError>;
}): RunnableProcedure<z.infer<TArgs>, TContext, TOutput, TError> {
  type Input = z.infer<TArgs>;

  const state: ProcedureState<TContext, Input, TOutput, TError> = {
    beforeInvokeHooks: [],
    afterInvokeHooks: [],
    onSuccessHooks: [],
    onErrorHooks: [],
  };

  const execute = async (
    context: TContext,
    input: Input
  ): AsyncResult<TOutput, TError> => {
    // 1. Parse arguments
    const parsed = parseArgs(options.args, input);

    if (parsed.isFailure()) {
      const error = exception({
        name: "ValidationError",
        message: parsed.error.message,
      }) as TError;

      // Call onError hooks for validation errors
      for (const hook of state.onErrorHooks) {
        try {
          await hook(context, input, error);
        } catch (err) {
          console.error("Error in onError hook:", err);
        }
      }

      return failure(error);
    }

    const data = parsed.value;

    // 2. Execute beforeInvoke hooks
    for (const hook of state.beforeInvokeHooks) {
      try {
        await hook(context, data);
      } catch (err) {
        const error = exception({
          name: "BeforeInvokeError",
          message: err instanceof Error ? err.message : String(err),
        }) as TError;

        // Call onError hooks for beforeInvoke errors
        for (const onErrorHook of state.onErrorHooks) {
          try {
            await onErrorHook(context, data, error);
          } catch (err) {
            console.error("Error in onError hook:", err);
          }
        }

        return failure(error);
      }
    }

    // 3. Execute handler
    let result: Result<TOutput, TError>;
    try {
      result = await options.handler(context, data);
    } catch (err) {
      const error = exception({
        name: "HandlerError",
        message: err instanceof Error ? err.message : String(err),
      }) as TError;
      result = failure(error);
    }

    // 4. Execute afterInvoke hooks (runs regardless of success/failure)
    for (const hook of state.afterInvokeHooks) {
      try {
        await hook(context, data, result);
      } catch (err) {
        console.error("Error in afterInvoke hook:", err);
      }
    }

    // 5. If handler threw, call onError hooks and return
    if (result.isFailure() && result.error.name === "HandlerError") {
      for (const hook of state.onErrorHooks) {
        try {
          await hook(context, data, result.error);
        } catch (err) {
          console.error("Error in onError hook:", err);
        }
      }
      return result;
    }

    // 6. Dispatch based on result
    if (result.isSuccess()) {
      // Success - call onSuccess hooks
      for (const hook of state.onSuccessHooks) {
        try {
          await hook(context, data, result.value);
        } catch (err) {
          console.error("Error in onSuccess hook:", err);
        }
      }
    } else {
      // Failure - call onError hooks
      for (const hook of state.onErrorHooks) {
        try {
          await hook(context, data, result.error);
        } catch (err) {
          console.error("Error in onError hook:", err);
        }
      }
    }

    return result;
  };

  // Attach hook methods to the function
  const procedure = Object.assign(execute, {
    beforeInvoke<Args = Input>(
      fn: (ctx: TContext, args: Args) => void | Promise<void>
    ): RunnableProcedure<Input, TContext, TOutput, TError> {
      state.beforeInvokeHooks.push(fn as any);
      return procedure as any;
    },
    afterInvoke<Args = Input>(
      fn: (
        ctx: TContext,
        args: Args,
        result: AsyncResult<TOutput, TError>
      ) => void | Promise<void>
    ): RunnableProcedure<Input, TContext, TOutput, TError> {
      state.afterInvokeHooks.push(fn as any);
      return procedure as any;
    },
    onSuccess<Data = TOutput, Args = Input>(
      fn: (ctx: TContext, args: Args, data: Data) => void | Promise<void>
    ): RunnableProcedure<Input, TContext, TOutput, TError> {
      state.onSuccessHooks.push(fn as any);
      return procedure as any;
    },
    onError<Err = TError, Args = Input>(
      fn: (ctx: TContext, args: Args, error: Err) => void | Promise<void>
    ): RunnableProcedure<Input, TContext, TOutput, TError> {
      state.onErrorHooks.push(fn as any);
      return procedure as any;
    },
  });

  return procedure as RunnableProcedure<Input, TContext, TOutput, TError>;
}

/**
 * Creates a mutation with lifecycle hooks support
 */
export function mutation<
  TArgs extends ZodType<any, any, any>,
  TOutput,
  TError extends Exception = Exception,
  TContext extends Record<string, unknown> = Record<string, unknown>
>(options: {
  name?: string;
  args: TArgs;
  handler: (
    ctx: TContext,
    args: z.infer<TArgs>
  ) => AsyncResult<TOutput, TError>;
}): RunnableProcedure<z.infer<TArgs>, TContext, TOutput, TError> {
  // Mutions use the same implementation as queries
  return query<TArgs, TOutput, TError, TContext>(options);
}
