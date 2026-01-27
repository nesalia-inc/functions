import { z } from "zod";

/**
 * Represents a domain failure cause (business logic failure)
 * These are expected failures that are part of normal business operations
 */
export interface Cause<TData extends Record<string, any> = Record<string, any>> {
  readonly _tag: "Cause";
  readonly name: string;
  readonly message: string;
  readonly data: TData;
  readonly timestamp: number;
  readonly stack?: string;
}

/**
 * Represents a system exception (unexpected error)
 * These are technical errors that should not happen in normal operation
 */
export interface Exception<TData extends Record<string, any> = Record<string, any>> {
  readonly _tag: "Exception";
  readonly name: string;
  readonly message: string;
  readonly data: TData;
  readonly timestamp: number;
  readonly stack?: string;
}

/**
 * Creates a Cause (domain failure)
 */
export function cause<TData extends Record<string, any> = Record<string, any>>(
  config: {
    name: string;
    message: string;
    data?: TData;
  }
): Cause<TData> {
  return {
    _tag: "Cause",
    name: config.name,
    message: config.message,
    data: (config.data || {}) as TData,
    timestamp: Date.now(),
    stack: new Error().stack,
  };
}

/**
 * Creates a Cause with a Zod schema for data validation
 */
export function causeWithSchema<
  TData extends Record<string, any> = Record<string, any>,
  ZodSchema extends z.ZodType<TData> = z.ZodType<TData>
>(config: {
  name: string;
  message: string;
  schema: ZodSchema;
}): (data: z.infer<ZodSchema>) => Cause<z.infer<ZodSchema>> {
  return (data: z.infer<ZodSchema>) => ({
    _tag: "Cause",
    name: config.name,
    message: config.message,
    data,
    timestamp: Date.now(),
    stack: new Error().stack,
  });
}

/**
 * Creates an Exception (system error)
 */
export function exception<TData extends Record<string, any> = Record<string, any>>(
  config: {
    name: string;
    message: string;
    data?: TData;
  }
): Exception<TData> {
  return {
    _tag: "Exception",
    name: config.name,
    message: config.message,
    data: (config.data || {}) as TData,
    timestamp: Date.now(),
    stack: new Error().stack,
  };
}

/**
 * Creates an Exception from an Error object
 */
export function exceptionFromError(
  error: Error,
  name?: string
): Exception<Record<string, any>> {
  return {
    _tag: "Exception",
    name: name || error.name || "Error",
    message: error.message,
    data: { originalError: error.constructor.name },
    timestamp: Date.now(),
    stack: error.stack,
  };
}

/**
 * Outcome type that can represent success, failure (causes), or error (exceptions)
 */
export type Outcome<
  TSuccess,
  TFailures extends Cause = Cause,
  TErrors extends Exception = Exception
> =
  | SuccessOutcome<TSuccess>
  | FailureOutcome<TFailures>
  | ExceptionOutcome<TErrors>;

/**
 * Successful outcome with a value
 */
export interface SuccessOutcome<T> {
  readonly _tag: "Success";
  readonly type: "success";
  readonly value: T;
  readonly metadata: OutcomeMetadata;
}

/**
 * Failure outcome with one or more domain causes
 */
export interface FailureOutcome<T extends Cause | Cause[] = Cause> {
  readonly _tag: "Failure";
  readonly type: "failure";
  readonly causes: T extends Cause ? Cause[] : T;
  readonly metadata: OutcomeMetadata;
}

/**
 * Exception outcome with one or more system errors
 */
export interface ExceptionOutcome<T extends Exception | Exception[] = Exception> {
  readonly _tag: "Exception";
  readonly type: "exception";
  readonly errors: T extends Exception ? Exception[] : T;
  readonly metadata: OutcomeMetadata;
}

/**
 * Metadata attached to outcomes for tracing and debugging
 */
export interface OutcomeMetadata {
  readonly timestamp: number;
  readonly callsite?: string;
  readonly trace: readonly Step[];
}

/**
 * A step in the outcome trace
 */
export interface Step {
  readonly timestamp: number;
  readonly outcome: Outcome<any, any, any>;
  readonly description?: string;
}

/**
 * Creates a successful outcome
 */
export function successOutcome<T>(
  value: T,
  metadata?: Partial<OutcomeMetadata>
): SuccessOutcome<T> {
  return {
    _tag: "Success",
    type: "success",
    value,
    metadata: {
      timestamp: Date.now(),
      callsite: getCallsite(),
      trace: [],
      ...metadata,
    },
  };
}

/**
 * Creates a failure outcome with one or more causes
 */
export function failureOutcome<T extends Cause | Cause[]>(
  causes: T,
  metadata?: Partial<OutcomeMetadata>
): FailureOutcome<T> {
  return {
    _tag: "Failure",
    type: "failure",
    causes: (Array.isArray(causes) ? causes : [causes]) as any,
    metadata: {
      timestamp: Date.now(),
      callsite: getCallsite(),
      trace: [],
      ...metadata,
    },
  };
}

/**
 * Creates an exception outcome with one or more errors
 */
export function exceptionOutcome<T extends Exception | Exception[]>(
  errors: T,
  metadata?: Partial<OutcomeMetadata>
): ExceptionOutcome<T> {
  return {
    _tag: "Exception",
    type: "exception",
    errors: (Array.isArray(errors) ? errors : [errors]) as any,
    metadata: {
      timestamp: Date.now(),
      callsite: getCallsite(),
      trace: [],
      ...metadata,
    },
  };
}

/**
 * Gets the callsite (where the outcome was created)
 */
function getCallsite(): string {
  const stack = new Error().stack;
  if (!stack) return "unknown";

  const lines = stack.split("\n");
  // Skip the first few lines (Error constructor, getCallsite, etc.)
  for (let i = 3; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line && !line.includes("outcome.ts")) {
      return line;
    }
  }
  return "unknown";
}

/**
 * Outcome matcher - provides type-safe pattern matching
 */
export function matchOutcome<
  TSuccess,
  TFailures extends Cause,
  TErrors extends Exception,
  TResult
>(
  outcome: Outcome<TSuccess, TFailures, TErrors>,
  handlers: {
    onSuccess: (value: TSuccess) => TResult;
    onFailure: (causes: TFailures extends Cause ? TFailures[] : TFailures) => TResult;
    onException: (errors: TErrors extends Exception ? TErrors[] : TErrors) => TResult;
  }
): TResult {
  switch (outcome._tag) {
    case "Success":
      return handlers.onSuccess(outcome.value);
    case "Failure":
      return handlers.onFailure(outcome.causes as any);
    case "Exception":
      return handlers.onException(outcome.errors as any);
  }
}

/**
 * Extends an Outcome with a trace step
 */
export function withTrace<T, F, E>(
  outcome: Outcome<T, F, E>,
  description: string
): Outcome<T, F, E> {
  const step: Step = {
    timestamp: Date.now(),
    outcome,
    description,
  };

  return {
    ...outcome,
    metadata: {
      ...outcome.metadata,
      trace: [...outcome.metadata.trace, step] as const,
    },
  };
}

/**
 * Pipes an outcome through a function, adding trace information
 */
export function pipe<T, F, E, T2>(
  outcome: Outcome<T, F, E>,
  fn: (value: T) => Outcome<T2, F, E>,
  description?: string
): Outcome<T2, F, E> {
  if (outcome._tag !== "Success") {
    return outcome as any;
  }

  const result = fn(outcome.value);
  return description ? withTrace(result, description) : result;
}

/**
 * Combines multiple causes into a single failure outcome
 */
export function combineCauses<T extends Cause>(
  causes: T[],
  metadata?: Partial<OutcomeMetadata>
): FailureOutcome<T[]> {
  return failureOutcome(causes, metadata);
}

/**
 * Combines multiple exceptions into a single exception outcome
 */
export function combineExceptions<T extends Exception>(
  errors: T[],
  metadata?: Partial<OutcomeMetadata>
): ExceptionOutcome<T[]> {
  return exceptionOutcome(errors, metadata);
}

/**
 * Type guards for outcomes
 */
export function isSuccess<T>(
  outcome: Outcome<T, any, any>
): outcome is SuccessOutcome<T> {
  return outcome._tag === "Success";
}

export function isFailure<F extends Cause>(
  outcome: Outcome<any, F, any>
): outcome is FailureOutcome<F> {
  return outcome._tag === "Failure";
}

export function isException<E extends Exception>(
  outcome: Outcome<any, any, E>
): outcome is ExceptionOutcome<E> {
  return outcome._tag === "Exception";
}

/**
 * Gets a human-readable description of the outcome
 */
export function describeOutcome<T, F, E>(
  outcome: Outcome<T, F, E>
): string {
  switch (outcome._tag) {
    case "Success":
      return `Success: ${JSON.stringify(outcome.value)}`;
    case "Failure":
      const causes = Array.isArray(outcome.causes)
        ? outcome.causes
        : [outcome.causes];
      return `Failure: ${causes.map((c) => `${c.name}: ${c.message}`).join(", ")}`;
    case "Exception":
      const errors = Array.isArray(outcome.errors)
        ? outcome.errors
        : [outcome.errors];
      return `Exception: ${errors.map((e) => `${e.name}: ${e.message}`).join(", ")}`;
  }
}

/**
 * Converts a legacy Result to an Outcome
 */
export function resultToOutcome<T, E>(
  result: { ok: true; value: T } | { ok: false; error: E },
  exceptionName: string = "ResultError"
): Outcome<T, Cause, Exception> {
  if (result.ok) {
    return successOutcome(result.value);
  }

  const error = result.error as any;
  if (error && typeof error === "object" && "name" in error) {
    return exceptionOutcome([error as Exception]);
  }

  return exceptionOutcome([
    exception({
      name: exceptionName,
      message: String(error),
      data: { originalError: error },
    }),
  ]);
}

/**
 * Converts an Outcome to a legacy Result
 */
export function outcomeToResult<T, E extends Exception>(
  outcome: Outcome<T, any, E>
): { ok: true; value: T } | { ok: false; error: E } {
  if (outcome._tag === "Success") {
    return { ok: true, value: outcome.value };
  }

  if (outcome._tag === "Exception") {
    const errors = Array.isArray(outcome.errors) ? outcome.errors[0] : outcome.errors;
    return { ok: false, error: errors as any };
  }

  // Convert failure to exception
  const causes = Array.isArray(outcome.causes) ? outcome.causes[0] : outcome.causes;
  return {
    ok: false,
    error: exception({
      name: causes.name,
      message: causes.message,
      data: causes.data,
    }) as any,
  };
}

/**
 * Common cause creators
 */
export const Causes = {
  notFound: (id: string | number, type: string = "Resource") =>
    cause({
      name: "NotFound",
      message: `${type} with ID '${id}' was not found`,
      data: { id, type },
    }),

  validation: (message: string, data?: Record<string, any>) =>
    cause({
      name: "ValidationError",
      message,
      data: data || {},
    }),

  unauthorized: (reason?: string) =>
    cause({
      name: "Unauthorized",
      message: reason || "Authentication required",
      data: {},
    }),

  forbidden: (reason?: string) =>
    cause({
      name: "Forbidden",
      message: reason || "Access denied",
      data: {},
    }),

  conflict: (message: string, data?: Record<string, any>) =>
    cause({
      name: "Conflict",
      message,
      data: data || {},
    }),

  preconditionFailed: (message: string, data?: Record<string, any>) =>
    cause({
      name: "PreconditionFailed",
      message,
      data: data || {},
    }),
};

/**
 * Common exception creators
 */
export const Exceptions = {
  internal: (message: string, data?: Record<string, any>) =>
    exception({
      name: "InternalError",
      message,
      data: data || {},
    }),

  database: (message: string, data?: Record<string, any>) =>
    exception({
      name: "DatabaseError",
      message,
      data: data || {},
    }),

  network: (message: string, data?: Record<string, any>) =>
    exception({
      name: "NetworkError",
      message,
      data: data || {},
    }),

  timeout: (operation: string, timeout: number) =>
    exception({
      name: "TimeoutError",
      message: `Operation '${operation}' timed out after ${timeout}ms`,
      data: { operation, timeout },
    }),

  notImplemented: (feature: string) =>
    exception({
      name: "NotImplementedError",
      message: `Feature '${feature}' is not implemented`,
      data: { feature },
    }),
};
