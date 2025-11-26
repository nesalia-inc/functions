import { success, AsyncResult, Unit, unit } from "@deessejs/functions";
import { AppContext, t } from ".";
import z from "zod";

export const getChallenge = t.query({
  args: z.object({ challengeId: z.number() }),
  handler: async (
    ctx,
    args,
  ): AsyncResult<{ id: number }, never> => {
    return success({ id: args.challengeId });
  },
});

export const createChallenge = t.mutation({
  args: z.object({ name: z.string() }),
  handler: async (ctx, args): AsyncResult<Unit, never> => {
    const challenge = ctx.db.challenges.create(...) // Example

    ctx.events.emit('challenge:created', challenge)
    return success(unit);
  },
});

export const onChallengeCreated = t.on({
  event: 'challenge:created',
  handler: async (ctx, payload: EventPayload<'challenge:created'>): AsyncResult<Unit, never> => {
    console.log(payload.challenge.name)
    return success(unit)
  }
})

// export const beforeGetChallenge = getChallenge.beforeInvoke((ctx, args) => {
//   ...
// })

// export const afterGetChallenge = getChallenge.afterInvoke((ctx, args) => {
//   ...
// })

export const challengeGroup = t.group({ getChallenge: getChallenge });
