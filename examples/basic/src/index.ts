import { AsyncResult, createAPI, success } from "@deessejs/functions";
import { z } from "zod";

const context = {
  user: {
    id: "123",
    email: "user@example.com",
  },
} as const;

const config = { context, a: { user: context.user } };

const api = createAPI(config);

export const double = api.query({
  name: "double",
  args: z.object({
    number: z.number().min(0).max(100),
  }),
  handler: async (args, ctx): AsyncResult<number, never> => {
    ctx.user.id; // Strongly typed: string (or literal "123" via 'as const')
    return success(args.number * 2);
  },
});

console.log(api.efeef({ number: 5 }));
