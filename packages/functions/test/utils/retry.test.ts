import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  retry,
  retryWithOutcome,
  RetryPredicates,
  RetryConfigs,
  withRetryLogging,
  type RetryConfig,
} from "../../src/utils/retry";
import { successOutcome, exceptionOutcome, Exceptions, Causes, failureOutcome } from "../../src/types/outcome";

describe("retry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("basic retry functionality", () => {
    it("should succeed on first attempt", async () => {
      const fn = vi.fn(async (value: string) => {
        return `result: ${value}`;
      });

      const retried = retry(fn);
      const result = await retried("test");

      expect(result).toBe("result: test");
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("should retry on failure and eventually succeed", async () => {
      let attempts = 0;
      const fn = vi.fn(async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error("Temporary failure");
        }
        return "success";
      });

      const retried = retry(fn, { maxAttempts: 5, initialDelay: 100 });
      const promise = retried();

      // Fast-forward past the retries
      await vi.advanceTimersByTimeAsync(500);

      const result = await promise;

      expect(result).toBe("success");
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it("should fail after max attempts", async () => {
      const fn = vi.fn(async () => {
        throw new Error("Persistent failure");
      });

      const retried = retry(fn, { maxAttempts: 3, initialDelay: 100 });
      const promise = retried();

      await vi.advanceTimersByTimeAsync(500);

      await expect(promise).rejects.toThrow("Persistent failure");
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it("should respect maxAttempts configuration", async () => {
      const fn = vi.fn(async () => {
        throw new Error("Error");
      });

      const retried = retry(fn, { maxAttempts: 5, initialDelay: 100 });
      const promise = retried();

      await vi.advanceTimersByTimeAsync(1000);

      await expect(promise).rejects.toThrow();
      expect(fn).toHaveBeenCalledTimes(5);
    });
  });

  describe("exponential backoff", () => {
    it("should use exponential backoff", async () => {
      const delays: number[] = [];
      const onRetry = vi.fn(async (attempt, error, delay) => {
        delays.push(delay);
      });

      const fn = vi.fn(async () => {
        throw new Error("Error");
      });

      const retried = retry(fn, {
        maxAttempts: 4,
        initialDelay: 100,
        backoffMultiplier: 2,
        jitter: false,
        onRetry,
      });

      const promise = retried();
      await vi.advanceTimersByTimeAsync(10000);

      await expect(promise).rejects.toThrow();

      // Expected delays: 100, 200, 400
      expect(delays).toHaveLength(3);
      expect(delays[0]).toBe(100);
      expect(delays[1]).toBe(200);
      expect(delays[2]).toBe(400);
    });

    it("should respect maxDelay", async () => {
      const delays: number[] = [];
      const onRetry = vi.fn(async (attempt, error, delay) => {
        delays.push(delay);
      });

      const fn = vi.fn(async () => {
        throw new Error("Error");
      });

      const retried = retry(fn, {
        maxAttempts: 5,
        initialDelay: 1000,
        backoffMultiplier: 10,
        maxDelay: 2000,
        jitter: false,
        onRetry,
      });

      const promise = retried();
      await vi.advanceTimersByTimeAsync(20000);

      await expect(promise).rejects.toThrow();

      // Expected delays: 1000, 2000, 2000 (capped), 2000 (capped)
      expect(delays).toHaveLength(4);
      expect(delays[0]).toBe(1000);
      expect(delays[1]).toBe(2000);
      expect(delays[2]).toBe(2000);
      expect(delays[3]).toBe(2000);
    });
  });

  describe("jitter", () => {
    it("should add jitter to delays", async () => {
      const delays: number[] = [];
      const onRetry = vi.fn(async (attempt, error, delay) => {
        delays.push(delay);
      });

      const fn = vi.fn(async () => {
        throw new Error("Error");
      });

      const retried = retry(fn, {
        maxAttempts: 4,
        initialDelay: 100,
        jitter: true,
        onRetry,
      });

      const promise = retried();
      await vi.advanceTimersByTimeAsync(1000);

      await expect(promise).rejects.toThrow();

      expect(delays).toHaveLength(3);
      // With jitter, delays should be different and <= base delay
      delays.forEach((delay) => {
        expect(delay).toBeGreaterThan(0);
        expect(delay).toBeLessThanOrEqual(100);
      });
    });
  });

  describe("isRetryable predicate", () => {
    it("should retry all errors by default", async () => {
      const fn = vi.fn(async () => {
        throw new Error("Any error");
      });

      const retried = retry(fn, { maxAttempts: 3, initialDelay: 10 });
      const promise = retried();

      await vi.advanceTimersByTimeAsync(100);

      await expect(promise).rejects.toThrow();
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it("should not retry when isRetryable returns false", async () => {
      const fn = vi.fn(async () => {
        throw new Error("Non-retryable error");
      });

      const retried = retry(fn, {
        maxAttempts: 3,
        initialDelay: 10,
        isRetryable: () => false,
      });

      await expect(retried()).rejects.toThrow();
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("should retry only specific errors", async () => {
      const fn = vi.fn(async (shouldRetry: boolean) => {
        if (shouldRetry) {
          throw new Error("Network error");
        }
        throw new Error("Validation error");
      });

      const retried = retry(fn, {
        maxAttempts: 3,
        initialDelay: 10,
        isRetryable: (error) => error.message.includes("Network"),
      });

      // Should retry network errors
      const promise1 = retried(true);
      await vi.advanceTimersByTimeAsync(100);
      await expect(promise1).rejects.toThrow("Network error");
      expect(fn).toHaveBeenCalledTimes(3);

      fn.mockClear();

      // Should not retry validation errors
      await expect(retried(false)).rejects.toThrow("Validation error");
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe("onRetry callback", () => {
    it("should call onRetry before each retry", async () => {
      const onRetry = vi.fn(async (attempt, error, delay) => {
        // Called before retry
      });

      const fn = vi.fn(async () => {
        throw new Error("Error");
      });

      const retried = retry(fn, {
        maxAttempts: 3,
        initialDelay: 10,
        onRetry,
      });

      const promise = retried();
      await vi.advanceTimersByTimeAsync(100);

      await expect(promise).rejects.toThrow();

      expect(onRetry).toHaveBeenCalledTimes(2); // 2 retries
      expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error), expect.any(Number));
      expect(onRetry).toHaveBeenCalledWith(2, expect.any(Error), expect.any(Number));
    });

    it("should continue if onRetry throws", async () => {
      const onRetry = vi.fn(async () => {
        throw new Error("Callback error");
      });

      const fn = vi.fn(async () => {
        throw new Error("Original error");
      });

      const retried = retry(fn, {
        maxAttempts: 3,
        initialDelay: 10,
        onRetry,
      });

      const promise = retried();
      await vi.advanceTimersByTimeAsync(100);

      // Should still retry despite onRetry errors
      await expect(promise).rejects.toThrow("Original error");
      expect(fn).toHaveBeenCalledTimes(3);
    });
  });

  describe("retryWithOutcome", () => {
    it("should succeed on first attempt with outcome", async () => {
      const fn = vi.fn(async (value: string) => {
        return successOutcome(`result: ${value}`);
      });

      const retried = retryWithOutcome(fn);
      const result = await retried("test");

      expect(result._tag).toBe("Success");
      if (result._tag === "Success") {
        expect(result.value).toBe("result: test");
      }
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("should retry on exception outcome", async () => {
      let attempts = 0;
      const fn = vi.fn(async () => {
        attempts++;
        if (attempts < 3) {
          return exceptionOutcome(Exceptions.network("Network error"));
        }
        return successOutcome("success");
      });

      const retried = retryWithOutcome(fn, {
        maxAttempts: 5,
        initialDelay: 100,
      });

      const promise = retried();
      await vi.advanceTimersByTimeAsync(500);

      const result = await promise;

      expect(result._tag).toBe("Success");
      if (result._tag === "Success") {
        expect(result.value).toBe("success");
      }
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it("should not retry on failure outcome", async () => {
      const fn = vi.fn(async () => {
        return failureOutcome(Causes.validation("Invalid input"));
      });

      const retried = retryWithOutcome(fn, {
        maxAttempts: 5,
        initialDelay: 100,
      });

      const result = await retried();

      expect(result._tag).toBe("Failure");
      expect(fn).toHaveBeenCalledTimes(1); // No retries
    });

    it("should respect isRetryable for outcomes", async () => {
      const fn = vi.fn(async () => {
        return exceptionOutcome(Exceptions.timeout("operation", 5000));
      });

      const retried = retryWithOutcome(fn, {
        maxAttempts: 3,
        initialDelay: 10,
        isRetryable: (error) => error.name !== "TimeoutError",
      });

      const result = await retried();

      expect(result._tag).toBe("Exception");
      expect(fn).toHaveBeenCalledTimes(1); // No retries
    });
  });

  describe("RetryPredicates", () => {
    describe("networkErrors", () => {
      it("should identify network errors", () => {
        const predicate = RetryPredicates.networkErrors;

        expect(predicate(new Error("ECONNREFUSED"))).toBe(true);
        expect(predicate(new Error("ENOTFOUND"))).toBe(true);
        expect(predicate(new Error("ETIMEDOUT"))).toBe(true);
        expect(predicate(new Error("Network error"))).toBe(true);
        expect(predicate(new Error("Other error"))).toBe(false);
      });
    });

    describe("serverErrors", () => {
      it("should identify 5xx errors", () => {
        const predicate = RetryPredicates.serverErrors;

        expect(predicate(new Error("HTTP 500"))).toBe(true);
        expect(predicate(new Error("HTTP 503"))).toBe(true);
        expect(predicate(new Error("HTTP 200"))).toBe(false);
        expect(predicate(new Error("HTTP 404"))).toBe(false);
      });
    });

    describe("rateLimitErrors", () => {
      it("should identify rate limit errors", () => {
        const predicate = RetryPredicates.rateLimitErrors;

        expect(predicate(new Error("HTTP 429"))).toBe(true);
        expect(predicate(new Error("Rate limit exceeded"))).toBe(true);
        expect(predicate(new Error("Too many requests"))).toBe(true);
        expect(predicate(new Error("Other error"))).toBe(false);
      });
    });

    describe("timeoutErrors", () => {
      it("should identify timeout errors", () => {
        const predicate = RetryPredicates.timeoutErrors;

        expect(predicate(new Error("TimeoutError: operation timed out"))).toBe(true);
        expect(predicate(new Error("Request timed out"))).toBe(true);
        expect(predicate(new Error("Other error"))).toBe(false);
      });
    });
  });

  describe("RetryConfigs", () => {
    it("should provide quick config", () => {
      expect(RetryConfigs.quick.maxAttempts).toBe(3);
      expect(RetryConfigs.quick.initialDelay).toBe(1000);
    });

    it("should provide standard config", () => {
      expect(RetryConfigs.standard.maxAttempts).toBe(5);
      expect(RetryConfigs.standard.maxDelay).toBe(30000);
    });

    it("should provide aggressive config", () => {
      expect(RetryConfigs.aggressive.maxAttempts).toBe(10);
      expect(RetryConfigs.aggressive.maxDelay).toBe(60000);
    });

    it("should provide network config with predicate", () => {
      expect(RetryConfigs.network.isRetryable).toBe(RetryPredicates.networkErrors);
    });
  });

  describe("withRetryLogging", () => {
    it("should add logging to retry config", async () => {
      const logs: string[] = [];
      const logger = vi.fn((msg) => logs.push(msg));

      const config = withRetryLogging(
        {
          maxAttempts: 3,
          initialDelay: 10,
        },
        logger
      );

      const fn = vi.fn(async () => {
        throw new Error("Test error");
      });

      const retried = retry(fn, config);
      const promise = retried();
      await vi.advanceTimersByTimeAsync(100);

      await expect(promise).rejects.toThrow();

      expect(logger).toHaveBeenCalled();
      expect(logs.some((log) => log.includes("Retry attempt"))).toBe(true);
    });
  });

  describe("real-world scenarios", () => {
    it("should handle network request with retry", async () => {
      let attempts = 0;
      const fetchWithRetry = retry(
        async (url: string) => {
          attempts++;
          if (attempts < 3) {
            throw new Error("ECONNREFUSED");
          }
          return `Data from ${url}`;
        },
        RetryConfigs.network
      );

      const promise = fetchWithRetry("https://api.example.com/data");
      await vi.advanceTimersByTimeAsync(10000);

      const result = await promise;

      expect(result).toBe("Data from https://api.example.com/data");
      expect(attempts).toBe(3);
    });

    it("should handle database operation with timeout", async () => {
      let attempts = 0;
      const dbOperation = retry(
        async (query: string) => {
          attempts++;
          if (attempts < 2) {
            throw Exceptions.timeout("dbQuery", 5000);
          }
          return `Query result: ${query}`;
        },
        {
          maxAttempts: 3,
          initialDelay: 100,
          isRetryable: RetryPredicates.timeoutErrors,
        }
      );

      const promise = dbOperation("SELECT * FROM users");
      await vi.advanceTimersByTimeAsync(500);

      const result = await promise;

      expect(result).toBe("Query result: SELECT * FROM users");
      expect(attempts).toBe(2);
    });

    it("should handle idempotent operation", async () => {
      const logs: number[] = [];

      const idempotentOperation = retry(
        async (id: string) => {
          logs.push(Date.now());
          return `Processed: ${id}`;
        },
        RetryConfigs.idempotent
      );

      const result = await idempotentOperation("123");

      expect(result).toBe("Processed: 123");
      expect(logs).toHaveLength(1);
    });
  });
});
