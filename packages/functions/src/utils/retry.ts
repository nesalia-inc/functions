import { Outcome, SuccessOutcome, exceptionOutcome, Exceptions, Exception } from "../types/outcome";
import { sleep } from "./sleep";

/**
 * Configuration for retry behavior
 */
export interface RetryConfig {
  /**
   * Maximum number of retry attempts (including initial attempt)
   * @default 3
   */
  maxAttempts?: number;

  /**
   * Initial delay between retries in milliseconds
   * @default 1000
   */
  initialDelay?: number;

  /**
   * Multiplier for exponential backoff
   * @default 2
   */
  backoffMultiplier?: number;

  /**
   * Maximum delay between retries in milliseconds
   * @default 30000 (30 seconds)
   */
  maxDelay?: number;

  /**
   * Whether to add jitter to retry delays to avoid thundering herd
   * @default true
   */
  jitter?: boolean;

  /**
   * Function to determine if an error is retryable
   * @default Retries all exceptions
   */
  isRetryable?: (error: Exception | Error) => boolean;

  /**
   * Callback called before each retry attempt
   * Can be used for logging or monitoring
   */
  onRetry?: (attempt: number, error: Exception | Error, delay: number) => void | Promise<void>;
}

/**
 * Default retry configuration
 */
const defaultRetryConfig: Required<Omit<RetryConfig, "onRetry">> = {
  maxAttempts: 3,
  initialDelay: 1000,
  backoffMultiplier: 2,
  maxDelay: 30000,
  jitter: true,
  isRetryable: () => true,
};

/**
 * Wraps an async function with retry logic
 *
 * @param fn - The async function to retry
 * @param config - Retry configuration
 * @returns A function that will retry on failure
 *
 * @example
 * ```ts
 * const fetchWithRetry = retry(
 *   async (url: string) => {
 *     const response = await fetch(url);
 *     if (!response.ok) throw new Error(`HTTP ${response.status}`);
 *     return response.json();
 *   },
 *   { maxAttempts: 5, initialDelay: 1000 }
 * );
 *
 * const data = await fetchWithRetry("https://api.example.com/data");
 * ```
 */
export function retry<TArgs extends any[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  config: RetryConfig = {}
): (...args: TArgs) => Promise<TResult> {
  const finalConfig = { ...defaultRetryConfig, ...config };

  return async (...args: TArgs): Promise<TResult> => {
    let lastError: Error | Exception | undefined;
    let attempt = 0;

    while (attempt < finalConfig.maxAttempts) {
      attempt++;

      try {
        // Attempt the operation
        const result = await fn(...args);

        // If successful and we had retries, the retry succeeded
        if (attempt > 1) {
          // Could log retry success here
        }

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if we should retry
        const isRetryable = finalConfig.isRetryable(lastError);
        const shouldRetry = isRetryable && attempt < finalConfig.maxAttempts;

        if (!shouldRetry) {
          throw lastError;
        }

        // Calculate delay with exponential backoff
        const baseDelay = finalConfig.initialDelay * Math.pow(finalConfig.backoffMultiplier, attempt - 1);
        const cappedDelay = Math.min(baseDelay, finalConfig.maxDelay);

        // Add jitter if enabled
        const delay = finalConfig.jitter
          ? Math.random() * cappedDelay
          : cappedDelay;

        // Call onRetry callback if provided
        if (finalConfig.onRetry) {
          try {
            await finalConfig.onRetry(attempt, lastError, delay);
          } catch (callbackError) {
            // Don't let callback errors interrupt retries
            console.error("Error in onRetry callback:", callbackError);
          }
        }

        // Wait before retrying
        await sleep(delay);
      }
    }

    // If we've exhausted all retries, throw the last error
    throw lastError;
  };
}

/**
 * Wraps an async function with retry logic that returns an Outcome
 *
 * @param fn - The async function to retry
 * @param config - Retry configuration
 * @returns A function that will retry on failure and return an Outcome
 *
 * @example
 * ```ts
 * const fetchWithRetry = retryWithOutcome(
 *   async (url: string) => {
 *     const response = await fetch(url);
 *     if (!response.ok) throw Exceptions.network(`HTTP ${response.status}`);
 *     return successOutcome(await response.json());
 *   },
 *   { maxAttempts: 3 }
 * );
 *
 * const outcome = await fetchWithRetry("https://api.example.com/data");
 * if (outcome._tag === "Success") {
 *   console.log(outcome.value);
 * }
 * ```
 */
export function retryWithOutcome<TArgs extends any[], TSuccess>(
  fn: (...args: TArgs) => Promise<Outcome<TSuccess, any, any>>,
  config: RetryConfig = {}
): (...args: TArgs) => Promise<Outcome<TSuccess, any, any>> {
  const finalConfig = { ...defaultRetryConfig, ...config };

  return async (...args: TArgs): Promise<Outcome<TSuccess, any, any>> => {
    let lastError: Outcome<any, any, any> | undefined;
    let attempt = 0;

    while (attempt < finalConfig.maxAttempts) {
      attempt++;

      const result = await fn(...args);

      // Check if successful
      if (result._tag === "Success") {
        return result;
      }

      // Store the error outcome
      lastError = result;

      // For Exception outcomes, check if retryable
      if (result._tag === "Exception") {
        const errors = Array.isArray(result.errors) ? result.errors : [result.errors];
        const isRetryable = errors.some(error =>
          finalConfig.isRetryable(error as any)
        );

        if (!isRetryable || attempt >= finalConfig.maxAttempts) {
          return result;
        }
      } else {
        // Failure outcomes are not retryable by default
        return result;
      }

      // Calculate delay with exponential backoff
      const baseDelay = finalConfig.initialDelay * Math.pow(finalConfig.backoffMultiplier, attempt - 1);
      const cappedDelay = Math.min(baseDelay, finalConfig.maxDelay);
      const delay = finalConfig.jitter ? Math.random() * cappedDelay : cappedDelay;

      // Call onRetry callback if provided
      if (finalConfig.onRetry) {
        try {
          const error = result._tag === "Exception"
            ? (Array.isArray(result.errors) ? result.errors[0] : result.errors)
            : Exceptions.internal("Operation failed");

          await finalConfig.onRetry(attempt, error as any, delay);
        } catch (callbackError) {
          console.error("Error in onRetry callback:", callbackError);
        }
      }

      // Wait before retrying
      await sleep(delay);
    }

    // Return the last error outcome
    return lastError || exceptionOutcome(Exceptions.internal("Unknown error"));
  };
}

/**
 * Retry predicates for common error types
 */
export const RetryPredicates = {
  /**
   * Retry on network errors
   */
  networkErrors: (error: Exception | Error) => {
    const name = error.name.toLowerCase();
    const message = error.message.toLowerCase();
    return (
      name.includes("network") ||
      name.includes("fetch") ||
      name.includes("timeout") ||
      message.includes("network") ||
      message.includes("econnrefused") ||
      message.includes("enotfound") ||
      message.includes("etimedout") ||
      message.includes("econnreset")
    );
  },

  /**
   * Retry on 5xx server errors
   */
  serverErrors: (error: Exception | Error) => {
    const message = error.message;
    const match = message.match(/HTTP (\d{3})/);
    if (match) {
      const statusCode = parseInt(match[1], 10);
      return statusCode >= 500 && statusCode < 600;
    }
    return false;
  },

  /**
   * Retry on rate limit errors (429)
   */
  rateLimitErrors: (error: Exception | Error) => {
    const message = error.message;
    return (
      message.includes("429") ||
      message.toLowerCase().includes("rate limit") ||
      message.toLowerCase().includes("too many requests")
    );
  },

  /**
   * Retry on timeout errors
   */
  timeoutErrors: (error: Exception | Error) => {
    const name = error.name.toLowerCase();
    const message = error.message.toLowerCase();
    return (
      name.includes("timeout") ||
      message.includes("timed out") ||
      message.includes("timeout")
    );
  },

  /**
   * Retry on any error (default)
   */
  allErrors: () => true,

  /**
   * Never retry
   */
  never: () => false,
};

/**
 * Common retry configurations
 */
export const RetryConfigs = {
  /**
   * Quick retry for transient failures (3 attempts, exponential backoff)
   */
  quick: {
    maxAttempts: 3,
    initialDelay: 1000,
    backoffMultiplier: 2,
    maxDelay: 10000,
  },

  /**
   * Standard retry for most operations (5 attempts, longer delays)
   */
  standard: {
    maxAttempts: 5,
    initialDelay: 1000,
    backoffMultiplier: 2,
    maxDelay: 30000,
  },

  /**
   * Aggressive retry for resilient operations (10 attempts, long delays)
   */
  aggressive: {
    maxAttempts: 10,
    initialDelay: 1000,
    backoffMultiplier: 2,
    maxDelay: 60000,
  },

  /**
   * Network retry with network-specific predicate
   */
  network: {
    maxAttempts: 5,
    initialDelay: 1000,
    backoffMultiplier: 2,
    maxDelay: 30000,
    isRetryable: RetryPredicates.networkErrors,
  },

  /**
   * Idempotent operation retry (safe to retry multiple times)
   */
  idempotent: {
    maxAttempts: 5,
    initialDelay: 500,
    backoffMultiplier: 1.5,
    maxDelay: 5000,
    jitter: true,
  },
};

/**
 * Creates a retry configuration with custom onRetry logging
 */
export function withRetryLogging(
  config: RetryConfig = {},
  logger: (message: string) => void = console.log
): RetryConfig {
  return {
    ...config,
    onRetry: async (attempt, error, delay) => {
      const message = `Retry attempt ${attempt} after ${Math.round(delay)}ms delay. Error: ${error.message}`;
      logger(message);

      // Call the original onRetry if provided
      if (config.onRetry) {
        await config.onRetry(attempt, error, delay);
      }
    },
  };
}
