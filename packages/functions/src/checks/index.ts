import { failure } from "../types/result";
import { CheckError } from "./errors";
import { Check } from "./types";

export const check: Check = ({ args, handler }) => {
  return async (input) => {
    const parsed = args.safeParse(input);

    if (!parsed.success) {
      return failure(
        new CheckError({
          code: "INVALID_ARGS",
          message: "Arguments invalides pour le check",
          details: parsed.error.issues,
        }),
      );
    }

    try {
      return await handler(parsed.data);
    } catch (error) {
      return failure(
        new CheckError({
          code: "INTERNAL_ERROR",
          message: "Erreur interne lors de l’exécution du check",
          details: error,
        }),
      );
    }
  };
};
