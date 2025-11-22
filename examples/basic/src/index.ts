import { createAPI, defineContext, success } from "@deessejs/functions";
import { z } from "zod";

const context = {
  user: { id: "123", email: "admin@deesse.art" },
};

// On définit le "t" avec le type du contexte
const t = defineContext<typeof context>();

// Une query isolée
const double = t.query({
  name: "double",
  args: z.object({ val: z.number() }),
  handler: async ({ val }, ctx) => {
    // ctx est typé !
    ctx.user
    return success(val * 2);
  },
});

// Un groupe auth
const authQueries = t.group({
  login: t.query({
    name: "login",
    args: z.object({
      /*...*/
    }),
    handler: async (args, ctx) => success(true),
  }),
});


const api = createAPI({
  context, // Le vrai objet contexte
  root: {
    double, // A la racine
    auth: authQueries, // Dans un sous-groupe
  },
});

// --- 3. Utilisation ---

// Type safe : api.double prend { val: number }
const res1 = await api.double({ val: 21 });

// Nested : api.auth.login
const res2 = await api.auth.login({});
