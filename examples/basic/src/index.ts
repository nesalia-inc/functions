import { success } from "@deessejs/functions";
import { defineContext, rpc } from "@deessejs/functions";
import z from "zod";


const context = { userId: "123" };

const { t, createAPI } = defineContext(context).withExtensions([
  rpc
]);

// Définition
const createUser = t.mutation({
  args: z.object({ name: z.string() }),
  handler: async (ctx, args) => {
    return success({ id: 1, name: args.name });
  },
});

// API
const api = createAPI({
  root: t.router({ auth: t.router({ createUser }) }),
});

// Run
const run = async () => {
  const res = await api.auth.createUser({ name: "Alice" });
  console.log("Result:", res.value
  );
};

run();