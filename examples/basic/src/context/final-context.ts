import { z, ZodType } from "zod";

// ==========================================
// 1. TYPES UTILITAIRES ET BASE
// ==========================================

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never;
type ExcludeEmpty<T> = T extends any
  ? keyof T extends never
    ? never
    : T
  : never;
type AsyncResult<T, E = Error> = Promise<
  { ok: true; data: T } | { ok: false; error: E }
>;

// --- Définition des Noeuds de l'arbre API ---

type MutationDef<Ctx, Args extends ZodType, Out, Err> = {
  _type: "mutation";
  args: Args;
  handler: (ctx: Ctx, args: z.infer<Args>) => AsyncResult<Out, Err>;
};

type RouterDef<T> = {
  _type: "router";
  routes: T;
};

// NOUVEAU : Définition d'un Listener d'événement
type ListenerDef<Ctx, Payload> = {
  _type: "listener";
  event: string;
  handler: (ctx: Ctx, payload: Payload) => Promise<void> | void;
};

// ==========================================
// 2. EXTENSION EVENTS
// ==========================================

// Interface simple d'un Bus d'événement
type EventBus = {
  emit: (event: string, payload: any) => void;
  // Méthode interne pour enregistrer les handlers (non exposée dans ctx idéalement, mais utile ici)
  on: (event: string, cb: (payload: any) => void) => void;
};

// Implémentation "Dummy" (en mémoire)
const createEventBus = (): EventBus => {
  const listeners: Record<string, Function[]> = {};
  return {
    on: (evt, cb) => {
      if (!listeners[evt]) listeners[evt] = [];
      listeners[evt].push(cb);
    },
    emit: (evt, payload) => {
      console.log(`[BUS] Emitting '${evt}'`, payload);
      listeners[evt]?.forEach((cb) => cb(payload));
    },
  };
};

// L'EXTENSION PROPREMENT DITE
const eventsExtension = defineExtension({
  // 1. Ce qu'on ajoute au Contexte (ctx.events.emit)
  context: {
    events: {
      emit: (event: string, payload: any) => { /* Dummy, sera remplacé au runtime */ },
    } as Pick<EventBus, 'emit'>
  },

  // 2. Ce qu'on ajoute au Builder t (t.on)
  builders: <C>() => ({
    on: <Payload>(
      event: string,
      handler: (ctx: C, payload: Payload) => Promise<void> | void
    ): ListenerDef<C, Payload> => ({
      _type: "listener",
      event,
      handler,
    }),
  }),
});

// ==========================================
// 3. SYSTÈME D'EXTENSION (CORE)
// ==========================================

type Extension<P, B> = { context: P; builders: B };
type DefaultBuilder = <C>() => {};

function defineExtension<Config extends { context?: any; builders?: any }>(
  config: Config
): Extension<
  Config extends { context: infer C } ? C : {},
  Config extends { builders: infer B } ? B : DefaultBuilder
> {
  return {
    context: config.context ?? {},
    builders: config.builders ?? (() => ({})),
  } as any;
}

// ContextAwareBuilder doit aussi supporter 'on' (qui a un handler mais pas d'args Zod)
type ContextAwareBuilder<RawB, FinalCtx> = {
  [K in keyof RawB]: RawB[K] extends (options: any) => any
    // Cas Mutation (args + handler)
    ? Parameters<RawB[K]>[0] extends { handler: any; args: any }
      ? <Args extends ZodType, Out, Err>(options: {
          args: Args;
          handler: (
            ctx: FinalCtx,
            args: z.infer<Args>
          ) => AsyncResult<Out, Err>;
        }) => MutationDef<FinalCtx, Args, Out, Err>
      : RawB[K]
    // Cas Listener (event + handler)
    : RawB[K] extends (evt: string, handler: any) => any
      ? <Payload>(
          event: string,
          handler: (ctx: FinalCtx, payload: Payload) => void
        ) => ListenerDef<FinalCtx, Payload>
      : RawB[K];
};

const defineContext = <InitCtx>() => {
  return {
    withExtensions: <const Exts extends readonly Extension<any, any>[]>(
      extensions: Exts
    ) => {
      type ExtensionContexts = UnionToIntersection<
        ExcludeEmpty<Exts[number]["context"]>
      >;
      type FinalCtx = InitCtx & ExtensionContexts;
      type RawBuilders = UnionToIntersection<
        ReturnType<Exts[number]["builders"]>
      >;
      type FinalAPI = ContextAwareBuilder<RawBuilders, FinalCtx> & {
        router: <R extends Record<string, any>>(routes: R) => RouterDef<R>;
        _Ctx: FinalCtx;
      };

      const api = extensions.reduce(
        (acc, ext) => ({ ...acc, ...ext.builders() }),
        { router: (routes: any) => ({ _type: "router", routes }) }
      ) as FinalAPI;

      return api;
    },
  };
};

// ==========================================
// 4. MOTEUR D'EXÉCUTION (createAPI)
// ==========================================

// On ajoute bus: EventBus aux options pour pouvoir enregistrer les listeners
export const createAPI = <
  Builder extends { _Ctx: any },
  RootDef
>(options: {
  contextFactory: () => Promise<Builder["_Ctx"]> | Builder["_Ctx"];
  root: RootDef;
  bus: EventBus; // Le bus réel est injecté ici
}) => {
  
  const buildRecursive = (node: any): any => {
    
    // CAS 1 : MUTATION
    if (node._type === "mutation") {
      return async (args: any) => {
        const parsedArgs = node.args.parse(args);
        const ctx = await options.contextFactory();
        return node.handler(ctx, parsedArgs);
      };
    }

    // CAS 2 : LISTENER (Nouveau)
    if (node._type === "listener") {
      // On enregistre le listener sur le bus immédiatement
      options.bus.on(node.event, async (payload) => {
        console.log(`[API] Listener triggered for '${node.event}'`);
        // On crée un contexte pour l'événement
        const ctx = await options.contextFactory();
        await node.handler(ctx, payload);
      });
      // Un listener ne retourne rien dans l'API publique (c'est passif)
      return undefined; 
    }

    // CAS 3 : ROUTER
    if (node._type === "router") {
      const routeurImpl: Record<string, any> = {};
      for (const key in node.routes) {
        const res = buildRecursive(node.routes[key]);
        // Si c'est un listener, il renvoie undefined, on ne l'ajoute pas à l'objet API
        if (res !== undefined) {
          routeurImpl[key] = res;
        }
      }
      return routeurImpl;
    }

    return node;
  };

  return buildRecursive(options.root);
};

// ==========================================
// 5. EXEMPLE
// ==========================================

// Autre extension basique pour avoir t.mutation
const coreExt = defineExtension({
    builders: <C>() => ({
      mutation: <A extends ZodType, O, E>(opts: {
        args: A;
        handler: (ctx: C, args: z.infer<A>) => AsyncResult<O, E>;
      }): MutationDef<C, A, O, E> => ({ _type: "mutation", ...opts }),
    }),
  });

// --- Setup ---
const t = defineContext<{}>().withExtensions([coreExt, eventsExtension]);

// --- Définition ---

// 1. Un listener qui réagit à "user:created"
const onUserCreated = t.on<{ id: string }>("user:created", (ctx, payload) => {
    // ctx.events existe grâce à eventsExtension
    console.log("⚡ Event received:", payload.id);
    // On pourrait ré-émettre un autre event
    ctx.events.emit("analytics:track", { type: "signup", userId: payload.id });
});

// 2. Une mutation qui émet "user:created"
const createUser = t.mutation({
    args: z.object({ name: z.string() }),
    handler: async (ctx, args) => {
        const newId = "u_" + Math.random().toString(36);
        console.log("💾 User created in DB");
        
        // EMISSION
        ctx.events.emit("user:created", { id: newId });

        return { ok: true, data: { id: newId } };
    }
});

const appDef = t.router({
    users: t.router({
        create: createUser,
        onCreated: onUserCreated // On attache le listener à l'arbre pour qu'il soit enregistré
    })
});

// --- Runtime ---

const globalBus = createEventBus();

const api = createAPI<typeof t, typeof appDef>({
    root: appDef,
    bus: globalBus,
    contextFactory: () => ({
        // On injecte le vrai bus dans le contexte pour que ctx.events.emit fonctionne
        events: globalBus
    })
});

// --- Test ---

const run = async () => {
    console.log("--- Start ---");
    // Appel de la mutation
    await api.users.create({ name: "Alice" });
    console.log("--- End ---");
};

run();

/* 
OUTPUT ATTENDU :
--- Start ---
💾 User created in DB
[BUS] Emitting 'user:created' { id: 'u_xxxxx' }
[API] Listener triggered for 'user:created'
⚡ Event received: u_xxxxx
[BUS] Emitting 'analytics:track' { type: 'signup', userId: 'u_xxxxx' }
--- End ---
*/