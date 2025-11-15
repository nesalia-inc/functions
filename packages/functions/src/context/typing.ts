import { getContext } from "./index";

// Helper type for context validation
export type ContextValidator<TContext> = (
  context: unknown,
) => context is TContext;

export const createContextValidator = <TContext>(
  validator: ContextValidator<TContext>,
): ContextValidator<TContext> => {
  return validator;
};

// Generic context access with validation
export const getValidatedContext = <TContext>(
  validator: ContextValidator<TContext>,
): TContext => {
  const context = getContext();
  if (validator(context)) {
    return context;
  }
  throw new Error("Context validation failed");
};

// Utility for partial context validation
export const assertContextProperties = <
  TContext extends Record<string, unknown>,
  TKeys extends readonly (keyof TContext)[],
>(
  keys: TKeys,
): asserts keys is TKeys => {
  const context = getContext();

  for (const key of keys) {
    if (!(key in context)) {
      throw new Error(`Required context property '${String(key)}' is missing`);
    }
  }
};

// Default to a loose type; users should define/override AppContext in their app
export type AppContext = Record<string, unknown>;

export const getTypedContext = <
  TContext extends AppContext = AppContext,
>(): TContext => {
  return getContext() as TContext;
};

export const getSafeTypedContext = <
  TContext extends AppContext = AppContext,
>(): TContext | null => {
  try {
    const context = getContext();
    return context as TContext;
  } catch {
    return null;
  }
};

export const assertContextProperty = <K extends keyof AppContext>(
  key: K,
): asserts key is K => {
  const context = getContext();
  if (!(key in context)) {
    throw new Error(`Context property '${key}' does not exist`);
  }
};

export const getContextPropertyTyped = <K extends keyof AppContext, T>(
  key: K,
): T | undefined => {
  const context = getContext();
  return context[key] as T | undefined;
};

export const setContextPropertyTyped = <K extends string, T>(
  key: K,
  value: T,
): void => {
  const context = getContext();
  const updatedContext = { ...context, [key]: value };
  // Note: Update global context as needed
};

// Other utilities (validator, etc.) remain unchanged...
