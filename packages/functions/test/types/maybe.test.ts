import { some, none, Maybe, Some, None } from "../../src/types/maybe";

describe("Maybe<T>", () => {
  describe("Some<T>", () => {
    it("should create a Some with a value", () => {
      const value = some("test-value");
      expect(value._tag).toBe("Some");
      expect(value.value).toBe("test-value");
    });

    it("should return true for isSome()", () => {
      const value = some("test-value");
      expect(value.isSome()).toBe(true);
    });

    it("should return false for isNone()", () => {
      const value = some("test-value");
      expect(value.isNone()).toBe(false);
    });

    it("should call onSome in match and return transformed value", () => {
      const value = some("test-value");
      const result = value.match({
        onSome: (val) => val.toUpperCase(),
        onNone: () => "default",
      });
      expect(result).toBe("TEST-VALUE");
    });

    it("should not call onNone in match", () => {
      const value = some("test-value");
      const onNoneSpy = vi.fn();
      const result = value.match({
        onSome: (val) => val,
        onNone: onNoneSpy,
      });
      expect(result).toBe("test-value");
      expect(onNoneSpy).not.toHaveBeenCalled();
    });

    it("should maintain immutability", () => {
      const original = some({ name: "test" });
      const modified = original.match({
        onSome: (val) => ({ ...val, age: 30 }),
        onNone: () => ({}),
      });
      expect(original.value).toEqual({ name: "test" });
      expect(modified).toEqual({ name: "test", age: 30 });
    });

    it("should work with different types", () => {
      const stringMaybe = some("hello");
      const numberMaybe = some(42);
      const objectMaybe = some({ id: 1, name: "test" });

      expect(stringMaybe.value).toBe("hello");
      expect(numberMaybe.value).toBe(42);
      expect(objectMaybe.value).toEqual({ id: 1, name: "test" });
    });

    it("should allow nullable values in Some", () => {
      const nullMaybe = some<string | null>(null);
      const undefinedMaybe = some<string | undefined>(undefined);

      expect(nullMaybe.isSome()).toBe(true);
      expect(undefinedMaybe.isSome()).toBe(true);
      expect(nullMaybe.value).toBe(null);
      expect(undefinedMaybe.value).toBe(undefined);
    });
  });

  describe("None", () => {
    it("should create a None", () => {
      const value = none();
      expect(value._tag).toBe("None");
    });

    it("should return false for isSome()", () => {
      const value = none();
      expect(value.isSome()).toBe(false);
    });

    it("should return true for isNone()", () => {
      const value = none();
      expect(value.isNone()).toBe(true);
    });

    it("should call onNone in match and return default value", () => {
      const value = none();
      const result = value.match({
        onSome: (val) => val,
        onNone: () => "default-value",
      });
      expect(result).toBe("default-value");
    });

    it("should not call onSome in match", () => {
      const value = none();
      const onSomeSpy = vi.fn();
      const result = value.match({
        onSome: onSomeSpy,
        onNone: () => "default",
      });
      expect(result).toBe("default");
      expect(onSomeSpy).not.toHaveBeenCalled();
    });

    it("should handle complex default values in match", () => {
      const value = none();
      const complexDefault = { id: 0, name: "unknown", createdAt: new Date() };

      const result = value.match({
        onSome: (val) => val,
        onNone: () => complexDefault,
      });

      expect(result).toEqual(complexDefault);
    });
  });

  describe("Maybe type guards", () => {
    it("should correctly identify Some type with type guards", () => {
      const maybeValue: Maybe<string> = some("test");

      if (maybeValue.isSome()) {
        expect(maybeValue.value).toBeDefined();
        expect(typeof maybeValue.value).toBe("string");
      } else {
        fail("Should be Some");
      }
    });

    it("should correctly identify None type with type guards", () => {
      const maybeValue: Maybe<string> = none();

      if (maybeValue.isNone()) {
        expect(maybeValue._tag).toBe("None");
      } else {
        fail("Should be None");
      }
    });
  });

  describe("Match behavior", () => {
    it("should work with both branches for Some", () => {
      const value = some("test");

      const result = value.match({
        onSome: (val) => `found: ${val}`,
        onNone: () => "not found",
      });

      expect(result).toBe("found: test");
    });

    it("should work with both branches for None", () => {
      const value = none();

      const result = value.match({
        onSome: (val) => `found: ${val}`,
        onNone: () => "not found",
      });

      expect(result).toBe("not found");
    });

    it("should preserve type safety in match", () => {
      const stringValue = some("hello");
      const result = stringValue.match({
        onSome: (val) => val.length,
        onNone: () => 0,
      });

      expect(typeof result).toBe("number");
      expect(result).toBe(5);
    });

    it("should handle async operations in match", async () => {
      const asyncValue = some("test");

      const result = await Promise.resolve(asyncValue).then((value) =>
        value.match({
          onSome: (val) => Promise.resolve(`async: ${val}`),
          onNone: () => Promise.resolve("async: none"),
        }),
      );

      expect(result).toBe("async: test");
    });
  });

  describe("Edge cases", () => {
    it("should handle zero as valid Some value", () => {
      const zeroValue = some(0);
      expect(zeroValue.isSome()).toBe(true);
      expect(zeroValue.value).toBe(0);
    });

    it("should handle empty string as valid Some value", () => {
      const emptyValue = some("");
      expect(emptyValue.isSome()).toBe(true);
      expect(emptyValue.value).toBe("");
    });

    it("should handle false as valid Some value", () => {
      const falseValue = some(false);
      expect(falseValue.isSome()).toBe(true);
      expect(falseValue.value).toBe(false);
    });

    it("should create multiple None instances independently", () => {
      const none1 = none();
      const none2 = none();

      expect(none1._tag).toBe("None");
      expect(none2._tag).toBe("None");
      expect(none1).not.toBe(none2); // Should be different instances
    });
  });

  describe("Integration with other types", () => {
    it("should work with Result pattern", () => {
      const successResult = { _tag: "Success" as const, value: "data" };
      const errorResult = {
        _tag: "Failure" as const,
        error: new Error("test"),
      };

      // Simulate converting Result to Maybe
      const resultToMaybe = (
        result: typeof successResult | typeof errorResult,
      ) => {
        if (result._tag === "Success") {
          return some(result.value);
        } else {
          return none();
        }
      };

      const successMaybe = resultToMaybe(successResult);
      const errorMaybe = resultToMaybe(errorResult);

      expect(successMaybe.isSome()).toBe(true);
      expect(successMaybe.value).toBe("data");
      expect(errorMaybe.isNone()).toBe(true);
    });
  });
});
