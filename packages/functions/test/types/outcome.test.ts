import { describe, it, expect, vi } from "vitest";
import {
  cause,
  causeWithSchema,
  exception,
  exceptionFromError,
  successOutcome,
  failureOutcome,
  exceptionOutcome,
  matchOutcome,
  withTrace,
  pipe,
  combineCauses,
  combineExceptions,
  isSuccess,
  isFailure,
  isException,
  describeOutcome,
  resultToOutcome,
  outcomeToResult,
  Causes,
  Exceptions,
  type Outcome,
  type Cause,
  type Exception,
} from "../../src/types/outcome";
import { z } from "zod";

describe("Outcome Type System", () => {
  describe("Cause (domain failures)", () => {
    it("should create a basic cause", () => {
      const notFound = cause({
        name: "UserNotFound",
        message: "User with ID '123' was not found",
        data: { userId: "123" },
      });

      expect(notFound._tag).toBe("Cause");
      expect(notFound.name).toBe("UserNotFound");
      expect(notFound.message).toContain("not found");
      expect(notFound.data).toEqual({ userId: "123" });
      expect(notFound.timestamp).toBeDefined();
    });

    it("should create a cause with Zod schema", () => {
      const userNotFound = causeWithSchema({
        name: "UserNotFound",
        message: "User not found",
        schema: z.object({
          userId: z.string(),
          searchedIn: z.array(z.string()),
        }),
      });

      const notFound = userNotFound({
        userId: "123",
        searchedIn: ["db1", "db2"],
      });

      expect(notFound.data).toEqual({
        userId: "123",
        searchedIn: ["db1", "db2"],
      });
    });

    it("should validate schema data", () => {
      const invalidUser = causeWithSchema({
        name: "InvalidUser",
        message: "Invalid user data",
        schema: z.object({
          email: z.string().email(),
        }),
      });

      // TypeScript should enforce the schema type
      const cause = invalidUser({ email: "test@example.com" });

      expect(cause.data.email).toBe("test@example.com");
    });
  });

  describe("Exception (system errors)", () => {
    it("should create a basic exception", () => {
      const error = exception({
        name: "DatabaseError",
        message: "Failed to connect to database",
        data: { host: "localhost", port: 5432 },
      });

      expect(error._tag).toBe("Exception");
      expect(error.name).toBe("DatabaseError");
      expect(error.message).toBe("Failed to connect to database");
      expect(error.data).toEqual({ host: "localhost", port: 5432 });
    });

    it("should create exception from Error object", () => {
      const originalError = new Error("Something went wrong");
      const ex = exceptionFromError(originalError);

      expect(ex._tag).toBe("Exception");
      expect(ex.name).toBe("Error");
      expect(ex.message).toBe("Something went wrong");
      expect(ex.stack).toBeDefined();
    });

    it("should create exception with custom name from Error", () => {
      const originalError = new Error("Connection failed");
      const ex = exceptionFromError(originalError, "ConnectionError");

      expect(ex.name).toBe("ConnectionError");
    });
  });

  describe("SuccessOutcome", () => {
    it("should create a success outcome", () => {
      const outcome = successOutcome({ id: 1, name: "Alice" });

      expect(outcome._tag).toBe("Success");
      expect(outcome.type).toBe("success");
      expect(outcome.value).toEqual({ id: 1, name: "Alice" });
      expect(outcome.metadata.timestamp).toBeDefined();
    });

    it("should allow custom metadata", () => {
      const customMetadata = {
        timestamp: 1234567890,
        callsite: "test-location",
        trace: [],
      };

      const outcome = successOutcome("value", customMetadata);

      expect(outcome.metadata.timestamp).toBe(1234567890);
      expect(outcome.metadata.callsite).toBe("test-location");
    });
  });

  describe("FailureOutcome", () => {
    it("should create a failure outcome with single cause", () => {
      const notFound = cause({
        name: "NotFound",
        message: "Resource not found",
      });

      const outcome = failureOutcome(notFound);

      expect(outcome._tag).toBe("Failure");
      expect(outcome.type).toBe("failure");
      expect(outcome.causes).toHaveLength(1);
      expect(outcome.causes[0]).toEqual(notFound);
    });

    it("should create a failure outcome with multiple causes", () => {
      const cause1 = cause({ name: "ValidationError", message: "Invalid email" });
      const cause2 = cause({ name: "ValidationError", message: "Invalid phone" });

      const outcome = failureOutcome([cause1, cause2]);

      expect(outcome._tag).toBe("Failure");
      expect(outcome.causes).toHaveLength(2);
      expect(outcome.causes[0].name).toBe("ValidationError");
      expect(outcome.causes[1].name).toBe("ValidationError");
    });
  });

  describe("ExceptionOutcome", () => {
    it("should create an exception outcome with single error", () => {
      const error = exception({
        name: "DatabaseError",
        message: "Connection failed",
      });

      const outcome = exceptionOutcome(error);

      expect(outcome._tag).toBe("Exception");
      expect(outcome.type).toBe("exception");
      expect(outcome.errors).toHaveLength(1);
      expect(outcome.errors[0]).toEqual(error);
    });

    it("should create an exception outcome with multiple errors", () => {
      const error1 = exception({ name: "TimeoutError", message: "Request timed out" });
      const error2 = exception({ name: "NetworkError", message: "Connection lost" });

      const outcome = exceptionOutcome([error1, error2]);

      expect(outcome._tag).toBe("Exception");
      expect(outcome.errors).toHaveLength(2);
    });
  });

  describe("matchOutcome", () => {
    it("should match success outcome", () => {
      const outcome = successOutcome("success value");

      const result = matchOutcome(outcome, {
        onSuccess: (value) => `Success: ${value}`,
        onFailure: (causes) => `Failure: ${causes.length}`,
        onException: (errors) => `Exception: ${errors.length}`,
      });

      expect(result).toBe("Success: success value");
    });

    it("should match failure outcome", () => {
      const cause1 = cause({ name: "Error", message: "Error 1" });
      const cause2 = cause({ name: "Error", message: "Error 2" });

      const outcome = failureOutcome([cause1, cause2]);

      const result = matchOutcome(outcome, {
        onSuccess: (value) => `Success: ${value}`,
        onFailure: (causes) => `Failure: ${causes.length} causes`,
        onException: (errors) => `Exception: ${errors.length}`,
      });

      expect(result).toBe("Failure: 2 causes");
    });

    it("should match exception outcome", () => {
      const error = exception({ name: "Error", message: "Test error" });

      const outcome = exceptionOutcome(error);

      const result = matchOutcome(outcome, {
        onSuccess: (value) => `Success: ${value}`,
        onFailure: (causes) => `Failure: ${causes.length}`,
        onException: (errors) => `Exception: ${errors.length} errors`,
      });

      expect(result).toBe("Exception: 1 errors");
    });
  });

  describe("Type guards", () => {
    it("should identify success outcomes", () => {
      const outcome = successOutcome("value");

      expect(isSuccess(outcome)).toBe(true);
      expect(isFailure(outcome)).toBe(false);
      expect(isException(outcome)).toBe(false);

      if (isSuccess(outcome)) {
        expect(typeof outcome.value).toBe("string");
      }
    });

    it("should identify failure outcomes", () => {
      const notFound = cause({ name: "NotFound", message: "Not found" });
      const outcome = failureOutcome(notFound);

      expect(isSuccess(outcome)).toBe(false);
      expect(isFailure(outcome)).toBe(true);
      expect(isException(outcome)).toBe(false);

      if (isFailure(outcome)) {
        expect(outcome.causes).toHaveLength(1);
      }
    });

    it("should identify exception outcomes", () => {
      const error = exception({ name: "Error", message: "Error" });
      const outcome = exceptionOutcome(error);

      expect(isSuccess(outcome)).toBe(false);
      expect(isFailure(outcome)).toBe(false);
      expect(isException(outcome)).toBe(true);

      if (isException(outcome)) {
        expect(outcome.errors).toHaveLength(1);
      }
    });
  });

  describe("Tracing", () => {
    it("should add trace to outcome", () => {
      const outcome = successOutcome("value");
      const traced = withTrace(outcome, "Step 1");

      expect(traced.metadata.trace).toHaveLength(1);
      expect(traced.metadata.trace[0].description).toBe("Step 1");
    });

    it("should preserve original outcome in trace", () => {
      const original = successOutcome("original");
      const traced = withTrace(original, "Transformed");

      expect(traced.metadata.trace[0].outcome).toBe(original);
    });

    it("should support pipe operation", async () => {
      const outcome = successOutcome(5);

      const result = pipe(outcome, (value) => {
        return successOutcome(value * 2);
      }, "Multiply by 2");

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value).toBe(10);
      }
      expect(result.metadata.trace).toHaveLength(1);
    });

    it("should not pipe through failures", () => {
      const notFound = cause({ name: "NotFound", message: "Not found" });
      const outcome = failureOutcome(notFound);

      const fn = vi.fn(() => successOutcome("should not be called"));
      const result = pipe(outcome, fn, "Should not execute");

      expect(isFailure(result)).toBe(true);
      expect(fn).not.toHaveBeenCalled();
    });

    it("should not pipe through exceptions", () => {
      const error = exception({ name: "Error", message: "Error" });
      const outcome = exceptionOutcome(error);

      const fn = vi.fn(() => successOutcome("should not be called"));
      const result = pipe(outcome, fn, "Should not execute");

      expect(isException(result)).toBe(true);
      expect(fn).not.toHaveBeenCalled();
    });

    it("should build trace through multiple pipes", () => {
      const outcome = successOutcome(1);

      const result = pipe(
        pipe(
          pipe(outcome, (v) => successOutcome(v + 1), "Add 1"),
          (v) => successOutcome(v * 2),
          "Multiply by 2"
        ),
        (v) => successOutcome(v - 1),
        "Subtract 1"
      );

      if (isSuccess(result)) {
        expect(result.value).toBe(3);
        expect(result.metadata.trace).toHaveLength(3);
      }
    });
  });

  describe("Combining", () => {
    it("should combine multiple causes", () => {
      const cause1 = cause({ name: "Error", message: "Error 1" });
      const cause2 = cause({ name: "Error", message: "Error 2" });
      const cause3 = cause({ name: "Error", message: "Error 3" });

      const outcome = combineCauses([cause1, cause2, cause3]);

      expect(isFailure(outcome)).toBe(true);
      if (isFailure(outcome)) {
        expect(outcome.causes).toHaveLength(3);
      }
    });

    it("should combine multiple exceptions", () => {
      const error1 = exception({ name: "Error", message: "Error 1" });
      const error2 = exception({ name: "Error", message: "Error 2" });

      const outcome = combineExceptions([error1, error2]);

      expect(isException(outcome)).toBe(true);
      if (isException(outcome)) {
        expect(outcome.errors).toHaveLength(2);
      }
    });
  });

  describe("Conversion utilities", () => {
    it("should convert Result to Outcome", () => {
      const successResult = { ok: true, value: "value" } as const;
      const outcome = resultToOutcome(successResult);

      expect(isSuccess(outcome)).toBe(true);
    });

    it("should convert failed Result to Exception outcome", () => {
      const failedResult = { ok: false, error: "error" } as const;
      const outcome = resultToOutcome(failedResult);

      expect(isException(outcome)).toBe(true);
    });

    it("should convert Outcome to Result", () => {
      const outcome = successOutcome("value");
      const result = outcomeToResult(outcome);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe("value");
      }
    });

    it("should convert Failure Outcome to Result as error", () => {
      const notFound = cause({ name: "NotFound", message: "Not found" });
      const outcome = failureOutcome(notFound);
      const result = outcomeToResult(outcome);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBeDefined();
      }
    });

    it("should convert Exception Outcome to Result", () => {
      const error = exception({ name: "Error", message: "Error" });
      const outcome = exceptionOutcome(error);
      const result = outcomeToResult(outcome);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe(error);
      }
    });
  });

  describe("Common causes", () => {
    it("should create notFound cause", () => {
      const cause = Causes.notFound("123", "User");

      expect(cause.name).toBe("NotFound");
      expect(cause.message).toContain("User");
      expect(cause.message).toContain("123");
      expect(cause.data).toEqual({ id: "123", type: "User" });
    });

    it("should create validation cause", () => {
      const cause = Causes.validation("Email is required", { field: "email" });

      expect(cause.name).toBe("ValidationError");
      expect(cause.message).toBe("Email is required");
      expect(cause.data).toEqual({ field: "email" });
    });

    it("should create unauthorized cause", () => {
      const cause = Causes.unauthorized("Invalid token");

      expect(cause.name).toBe("Unauthorized");
      expect(cause.message).toBe("Invalid token");
    });

    it("should create forbidden cause", () => {
      const cause = Causes.forbidden("Insufficient permissions");

      expect(cause.name).toBe("Forbidden");
      expect(cause.message).toBe("Insufficient permissions");
    });

    it("should create conflict cause", () => {
      const cause = Causes.conflict("Email already exists", { email: "test@example.com" });

      expect(cause.name).toBe("Conflict");
      expect(cause.message).toBe("Email already exists");
    });
  });

  describe("Common exceptions", () => {
    it("should create internal exception", () => {
      const exc = Exceptions.internal("Unexpected error occurred");

      expect(exc.name).toBe("InternalError");
      expect(exc.message).toBe("Unexpected error occurred");
    });

    it("should create database exception", () => {
      const exc = Exceptions.database("Connection failed", { host: "localhost" });

      expect(exc.name).toBe("DatabaseError");
      expect(exc.message).toBe("Connection failed");
      expect(exc.data).toEqual({ host: "localhost" });
    });

    it("should create network exception", () => {
      const exc = Exceptions.network("Network unreachable");

      expect(exc.name).toBe("NetworkError");
    });

    it("should create timeout exception", () => {
      const exc = Exceptions.timeout("fetchData", 5000);

      expect(exc.name).toBe("TimeoutError");
      expect(exc.message).toContain("fetchData");
      expect(exc.message).toContain("5000");
      expect(exc.data).toEqual({ operation: "fetchData", timeout: 5000 });
    });

    it("should create not implemented exception", () => {
      const exc = Exceptions.notImplemented("featureX");

      expect(exc.name).toBe("NotImplementedError");
      expect(exc.message).toContain("featureX");
    });
  });

  describe("describeOutcome", () => {
    it("should describe success outcome", () => {
      const outcome = successOutcome({ id: 1, name: "Test" });
      const description = describeOutcome(outcome);

      expect(description).toContain("Success");
    });

    it("should describe failure outcome", () => {
      const cause1 = cause({ name: "Error1", message: "First error" });
      const cause2 = cause({ name: "Error2", message: "Second error" });
      const outcome = failureOutcome([cause1, cause2]);

      const description = describeOutcome(outcome);

      expect(description).toContain("Failure");
      expect(description).toContain("Error1");
      expect(description).toContain("Error2");
    });

    it("should describe exception outcome", () => {
      const error = exception({ name: "TestError", message: "Test error message" });
      const outcome = exceptionOutcome(error);

      const description = describeOutcome(outcome);

      expect(description).toContain("Exception");
      expect(description).toContain("TestError");
      expect(description).toContain("Test error message");
    });
  });

  describe("Real-world scenarios", () => {
    it("should handle user registration flow", async () => {
      // Step 1: Validate email
      const email = "invalid-email";
      const emailValidation = z.string().email().safeParse(email);

      if (!emailValidation.success) {
        const outcome = failureOutcome(
          Causes.validation("Invalid email format", { email })
        );
        expect(isFailure(outcome)).toBe(true);
        return;
      }

      // Step 2: Check if user exists
      const userExists = true;
      if (userExists) {
        const outcome = failureOutcome(
          Causes.conflict("User already exists", { email })
        );
        expect(isFailure(outcome)).toBe(true);
        return;
      }

      // Step 3: Create user
      const outcome = successOutcome({ id: 1, email });
      expect(isSuccess(outcome)).toBe(true);
    });

    it("should handle database operation with multiple errors", async () => {
      const dbErrors = [
        Exceptions.database("Connection timeout"),
        Exceptions.database("Query timeout"),
      ];

      const outcome = exceptionOutcome(dbErrors);

      expect(isException(outcome)).toBe(true);
      if (isException(outcome)) {
        expect(outcome.errors).toHaveLength(2);
        expect(outcome.errors.every((e) => e.name === "DatabaseError")).toBe(true);
      }
    });

    it("should build causal chain through pipe", () => {
      const validate = (value: unknown) => {
        if (typeof value !== "number") {
          return failureOutcome(
            Causes.validation("Value must be a number", { value })
          );
        }
        return successOutcome(value);
      };

      const checkPositive = (value: number) => {
        if (value < 0) {
          return failureOutcome(
            Causes.validation("Value must be positive", { value })
          );
        }
        return successOutcome(value);
      };

      const double = (value: number) => successOutcome(value * 2);

      const result = pipe(
        pipe(pipe(successOutcome(5), validate, "validate"), checkPositive, "checkPositive"),
        double,
        "double"
      );

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value).toBe(10);
        expect(result.metadata.trace).toHaveLength(3);
      }
    });
  });

  describe("Type safety", () => {
    it("should preserve success type", () => {
      const outcome: Outcome<string, Cause, Exception> = successOutcome("test");

      if (isSuccess(outcome)) {
        expect(typeof outcome.value).toBe("string");
      }
    });

    it("should preserve failure type", () => {
      type MyCause = Cause<{ field: string }>;
      const myCause: MyCause = cause({
        name: "Error",
        message: "Error",
        data: { field: "test" },
      });

      const outcome = failureOutcome(myCause);

      if (isFailure(outcome)) {
        expect(outcome.causes[0].data.field).toBe("test");
      }
    });

    it("should work with complex data structures", () => {
      type User = { id: number; name: string; email: string };
      const outcome = successOutcome<User>({
        id: 1,
        name: "Alice",
        email: "alice@example.com",
      });

      if (isSuccess(outcome)) {
        expect(outcome.value.email).toContain("@");
      }
    });
  });
});
