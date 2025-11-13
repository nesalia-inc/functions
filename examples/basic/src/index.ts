import { AsyncResult, query, success, createAPI } from "@deessejs/functions";
import { z } from "zod";

const api = createAPI

export const double = query({
  args: z.object({
    number: z.number().min(0).max(100),
  }),
  handler: async (args, ctx): AsyncResult<number, never> => {
    return success(args.number * 2);
  },
});


const value = await double({ number: 42 });

