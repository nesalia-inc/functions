import { createAPI } from '../src/api';
import { query, mutation, createQuery } from '../src/functions';
import type { AppContext } from '../src/context/generated';
import { z } from 'zod';

// Exemple 1: Créer une API avec contexte typé
const api = createAPI({
  context: {
    user: null,
    permissions: [],
    settings: {
      theme: 'dark',
      language: 'fr'
    },
    database: {
      host: 'localhost',
      port: 5432,
      pool: 10
    }
  },
  commands: [],
  events: []
}, 'App');

// Exemple 2: Définir une query avec typage fort
const getUser = query({
  args: z.object({
    id: z.string().uuid()
  }),
  handler: async (args, ctx: AppContext) => {
    // Accès typé au contexte !
    const theme = ctx.settings.theme; // Type: string
    const language = ctx.settings.language; // Type: string
    const user = ctx.user; // Type: null | User
    const permissions = ctx.permissions; // Type: string[]
    const dbHost = ctx.database.host; // Type: string
    const dbPort = ctx.database.port; // Type: number

    // Simuler une requête à la base de données
    console.log(`Getting user ${args.id} with theme: ${theme}, language: ${language}`);
    console.log(`Database connection: ${dbHost}:${dbPort}`);

    return { id: args.id, name: 'John Doe' };
  }
});

// Exemple 3: Utiliser le query builder
const createQueryWithAppContext = createQuery<AppContext>();

const getSettings = createQueryWithAppContext({
  args: z.object({
    key: z.enum(['theme', 'language'])
  }),
  handler: async (args, ctx: AppContext) => {
    const settings = ctx.settings;

    if (args.key === 'theme') {
      return settings.theme; // Type: string
    } else {
      return settings.language; // Type: string
    }
  }
});

// Exemple 4: Mutation (sans contexte pour rester pur)
const updateUser = mutation({
  args: z.object({
    id: z.string().uuid(),
    name: z.string().min(2).max(50)
  }),
  handler: async (args) => {
    // Mutation pure, pas d'accès au contexte
    console.log(`Updating user ${args.id} with name: ${args.name}`);
    return { id: args.id, name: args.name, updatedAt: new Date() };
  }
});

// Exemple 5: Extension du contexte
const extendedApi = api.addContext('session', {
  token: 'abc123',
  expiresAt: new Date(Date.now() + 3600000)
});

// Maintenant on peut accéder au token typé
const getSessionToken = query({
  args: z.object({}),
  handler: async (args, ctx: AppContext & { session: { token: string; expiresAt: Date } }) => {
    const token = ctx.session.token; // Type: string
    const expiresAt = ctx.session.expiresAt; // Type: Date
    return { token, expiresAt };
  }
});

// Exemple d'utilisation
async function demonstrateUsage() {
  // Créer l'API (génère automatiquement les types)
  const appApi = createAPI({
    context: {
      user: { id: '1', name: 'John', email: 'john@example.com' },
      permissions: ['read', 'write'],
      config: {
        debug: true,
        maxRetries: 3
      }
    },
    commands: [],
    events: []
  }, 'MyApp');

  // Utiliser une query typée
  const result = await getUser({ id: '123-456-789' });

  if (result.isSuccess()) {
    console.log('User found:', result.value);
  } else {
    console.error('Error:', result.error.message);
  }

  // Utiliser une mutation
  const updateResult = await updateUser({
    id: '123-456-789',
    name: 'Jane Doe'
  });

  // Utiliser le contexte étendu
  const sessionApi = appApi.addContext('cache', {
    ttl: 300,
    maxSize: 1000
  });

  const cacheResult = await query({
    args: z.object({ key: z.string() }),
    handler: async (args, ctx: AppContext & { cache: { ttl: number; maxSize: number } }) => {
      const ttl = ctx.cache.ttl; // Type: number
      const maxSize = ctx.cache.maxSize; // Type: number
      return { key: args.key, value: 'cached data', ttl, maxSize };
    }
  })({ key: 'user:123' });

  console.log('Cache result:', cacheResult);
}

export {
  api,
  getUser,
  getSettings,
  updateUser,
  getSessionToken,
  demonstrateUsage
};