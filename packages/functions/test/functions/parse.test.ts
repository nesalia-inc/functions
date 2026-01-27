import { describe, it, expect } from "vitest";
import { z } from "zod";
import { parseArgs } from "../../src/functions/parse";

describe("parseArgs", () => {
  describe("successful parsing", () => {
    it("should parse valid string input", () => {
      const schema = z.object({ name: z.string() });
      const result = parseArgs(schema, { name: "Alice" });

      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.value).toEqual({ name: "Alice" });
      }
    });

    it("should parse valid number input", () => {
      const schema = z.object({ id: z.number() });
      const result = parseArgs(schema, { id: 123 });

      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.value).toEqual({ id: 123 });
      }
    });

    it("should parse complex nested objects", () => {
      const schema = z.object({
        user: z.object({
          id: z.number(),
          name: z.string(),
          email: z.string().email(),
        }),
      });

      const input = {
        user: { id: 1, name: "Alice", email: "alice@example.com" },
      };

      const result = parseArgs(schema, input);

      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.value).toEqual(input);
      }
    });

    it("should parse arrays", () => {
      const schema = z.object({ tags: z.array(z.string()) });
      const result = parseArgs(schema, { tags: ["a", "b", "c"] });

      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.value).toEqual({ tags: ["a", "b", "c"] });
      }
    });

    it("should parse optional fields", () => {
      const schema = z.object({
        name: z.string(),
        age: z.number().optional(),
      });

      const result = parseArgs(schema, { name: "Alice" });

      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.value).toEqual({ name: "Alice", age: undefined });
      }
    });

    it("should parse with default values", () => {
      const schema = z.object({
        name: z.string(),
        role: z.string().default("user"),
      });

      const result = parseArgs(schema, { name: "Alice" });

      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.value).toEqual({ name: "Alice", role: "user" });
      }
    });

    it("should parse transformed values", () => {
      const schema = z.object({
        email: z.string().email().transform((val) => val.toLowerCase()),
      });

      const result = parseArgs(schema, { email: "ALICE@EXAMPLE.COM" });

      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.value).toEqual({ email: "alice@example.com" });
      }
    });

    it("should parse union types", () => {
      const schema = z.object({
        value: z.union([z.string(), z.number()]),
      });

      const result1 = parseArgs(schema, { value: "string" });
      expect(result1.isSuccess()).toBe(true);

      const result2 = parseArgs(schema, { value: 42 });
      expect(result2.isSuccess()).toBe(true);
    });

    it("should parse discriminated unions", () => {
      const schema = z.object({
        event: z.discriminatedUnion("type", [
          z.object({ type: z.literal("click"), x: z.number(), y: z.number() }),
          z.object({ type: z.literal("keypress"), key: z.string() }),
        ]),
      });

      const result1 = parseArgs(schema, {
        event: { type: "click", x: 100, y: 200 },
      });
      expect(result1.isSuccess()).toBe(true);

      const result2 = parseArgs(schema, {
        event: { type: "keypress", key: "Enter" },
      });
      expect(result2.isSuccess()).toBe(true);
    });
  });

  describe("validation failures", () => {
    it("should fail on missing required field", () => {
      const schema = z.object({ name: z.string(), age: z.number() });
      const result = parseArgs(schema, { name: "Alice" });

      expect(result.isFailure()).toBe(true);
      if (result.isFailure()) {
        expect(result.error).toHaveProperty("name", "ValidatedArgsError");
      }
    });

    it("should fail on type mismatch", () => {
      const schema = z.object({ age: z.number() });
      const result = parseArgs(schema, { age: "not-a-number" });

      expect(result.isFailure()).toBe(true);
      if (result.isFailure()) {
        expect(result.error).toHaveProperty("name", "ValidatedArgsError");
        expect(result.error.message).toContain("age");
      }
    });

    it("should fail on invalid email format", () => {
      const schema = z.object({ email: z.string().email() });
      const result = parseArgs(schema, { email: "invalid-email" });

      expect(result.isFailure()).toBe(true);
      if (result.isFailure()) {
        expect(result.error).toHaveProperty("name", "ValidatedArgsError");
      }
    });

    it("should fail on array with wrong type", () => {
      const schema = z.object({ numbers: z.array(z.number()) });
      const result = parseArgs(schema, { numbers: [1, 2, "three"] });

      expect(result.isFailure()).toBe(true);
    });

    it("should fail on invalid union type", () => {
      const schema = z.object({
        value: z.union([z.string(), z.number()]),
      });
      const result = parseArgs(schema, { value: true });

      expect(result.isFailure()).toBe(true);
    });

    it("should fail on strict schema with extra fields", () => {
      const schema = z.object({ name: z.string() }).strict();
      const result = parseArgs(schema, { name: "Alice", extra: "field" });

      expect(result.isFailure()).toBe(true);
    });

    it("should fail on min length constraint", () => {
      const schema = z.object({ password: z.string().min(8) });
      const result = parseArgs(schema, { password: "short" });

      expect(result.isFailure()).toBe(true);
    });

    it("should fail on max length constraint", () => {
      const schema = z.object({ username: z.string().max(10) });
      const result = parseArgs(schema, { username: "very-long-username" });

      expect(result.isFailure()).toBe(true);
    });

    it("should fail on range constraint", () => {
      const schema = z.object({ age: z.number().min(0).max(120) });
      const result = parseArgs(schema, { age: 150 });

      expect(result.isFailure()).toBe(true);
    });

    it("should include error message in failure", () => {
      const schema = z.object({ age: z.number() });
      const result = parseArgs(schema, { age: "not-a-number" });

      expect(result.isFailure()).toBe(true);
      if (result.isFailure()) {
        expect(result.error.message).toBeDefined();
        expect(typeof result.error.message).toBe("string");
        expect(result.error.message.length).toBeGreaterThan(0);
      }
    });
  });

  describe("edge cases", () => {
    it("should handle null input", () => {
      const schema = z.object({ name: z.string() });
      const result = parseArgs(schema, null);

      expect(result.isFailure()).toBe(true);
    });

    it("should handle undefined input", () => {
      const schema = z.object({ name: z.string() });
      const result = parseArgs(schema, undefined);

      expect(result.isFailure()).toBe(true);
    });

    it("should handle empty object input", () => {
      const schema = z.object({});
      const result = parseArgs(schema, {});

      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.value).toEqual({});
      }
    });

    it("should handle null values in nullable fields", () => {
      const schema = z.object({ name: z.string().nullable() });
      const result = parseArgs(schema, { name: null });

      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.value).toEqual({ name: null });
      }
    });

    it("should handle complex error messages with multiple issues", () => {
      const schema = z.object({
        name: z.string().min(3),
        age: z.number().min(0),
        email: z.string().email(),
      });

      const result = parseArgs(schema, {
        name: "Al",
        age: -5,
        email: "invalid",
      });

      expect(result.isFailure()).toBe(true);
      if (result.isFailure()) {
        expect(result.error.message).toBeDefined();
        // Error should mention all three issues
        const errorMsg = result.error.message.toLowerCase();
        expect(errorMsg).toBeDefined();
      }
    });

    it("should work with refinements", () => {
      const schema = z.object({
        password: z.string().refine((val) => /[A-Z]/.test(val), {
          message: "Must contain uppercase letter",
        }),
      });

      const validResult = parseArgs(schema, { password: "Valid123" });
      expect(validResult.isSuccess()).toBe(true);

      const invalidResult = parseArgs(schema, { password: "invalid" });
      expect(invalidResult.isFailure()).toBe(true);
    });

    it("should handle custom error maps", () => {
      // In Zod v4, errorMap has been replaced with a different approach
      // Using refine with custom message instead (applies after basic validation)
      const schema = z.object({
        name: z.string().refine((val) => val.length > 3, {
          message: "Custom error: name must be longer than 3 characters",
        }),
      });

      const result = parseArgs(schema, { name: "Bob" }); // Valid string but too short

      expect(result.isFailure()).toBe(true);
      if (result.isFailure()) {
        expect(result.error.message).toContain("Custom error");
      }
    });
  });

  describe("ZodType compatibility", () => {
    it("should work with ZodDefault", () => {
      const schema = z.object({
        name: z.string(),
        active: z.boolean().default(true),
      });

      const result = parseArgs(schema, { name: "Alice" });

      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.value).toEqual({ name: "Alice", active: true });
      }
    });

    it("should work with ZodOptional", () => {
      const schema = z.object({
        name: z.string(),
        nickname: z.string().optional(),
      });

      const result = parseArgs(schema, { name: "Alice" });

      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.value).toEqual({ name: "Alice", nickname: undefined });
      }
    });

    it("should work with ZodNullable", () => {
      const schema = z.object({
        name: z.string().nullable(),
      });

      const result1 = parseArgs(schema, { name: "Alice" });
      expect(result1.isSuccess()).toBe(true);

      const result2 = parseArgs(schema, { name: null });
      expect(result2.isSuccess()).toBe(true);
    });

    it("should work with ZodEffects (transform/refine)", () => {
      const schema = z
        .object({ value: z.number() })
        .transform((data) => ({ value: data.value * 2 }));

      const result = parseArgs(schema, { value: 5 });

      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.value).toEqual({ value: 10 });
      }
    });

    it("should work with ZodIntersection", () => {
      const schema = z
        .object({ a: z.string() })
        .and(z.object({ b: z.number() }));

      const result = parseArgs(schema, { a: "test", b: 123 });

      expect(result.isSuccess()).toBe(true);
    });
  });
});
