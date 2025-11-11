import { AsyncResult } from "../types/async-result";
import { Unit } from "../types/unit";

import { CheckError } from "./errors";
import { z, ZodType } from "zod";

export type CheckResult = AsyncResult<Unit, CheckError>;

export type Check<
  TArgs extends ZodType = ZodType,
  TError extends CheckError = CheckError,
> = (options: {
  args: TArgs;
  handler: (args: z.infer<TArgs>) => AsyncResult<Unit, TError>;
}) => (args: z.infer<TArgs>) => AsyncResult<Unit, TError>;
