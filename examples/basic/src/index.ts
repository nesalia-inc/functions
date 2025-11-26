import { createAPI, defineContext, rpc, events } from "@deessejs/functions";
import { challengeGroup } from "./challenges";

const context = {
  user: { id: "123", email: "admin@deesse.art" },
};

export const t = defineContext<typeof context>().withExtensions({
  extensions: [rpc()],
});



export type AppContext = typeof t.context;

const api = createAPI({
  context: t.context,
  root: {
    challenges: challengeGroup,
  },
});

console.log(api.challenges.getChallenge({ challengeId: 1234 }));
