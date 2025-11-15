#!/usr/bin/env tsx

import { createAPI } from './src/api';
import { query } from './src/functions/query';
import { mutation } from './src/functions/mutation';
import { getContext, createContext } from './src/context';
import { z } from 'zod';

console.log('🚀 Testing Context Type Generation System\n');

// Test 1: Créer une API avec contexte
console.log('📋 Test 1: Creating API with context...');
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
}, 'TestApp');

console.log('✅ API created successfully');

// Test 2: Vérifier que le fichier généré existe
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const generatedPath = join(process.cwd(), 'src', 'context', 'generated.ts');
if (existsSync(generatedPath)) {
  console.log('✅ Generated file exists');
  const content = readFileSync(generatedPath, 'utf8');
  console.log('📄 Generated content:');
  console.log(content);
} else {
  console.log('❌ Generated file does not exist');
}

// Test 3: Créer une query avec typage fort
console.log('\n📋 Test 3: Creating typed query...');
const getUser = query({
  args: z.object({
    id: z.string().uuid()
  }),
  handler: async (args, ctx: any) => {
    const theme = ctx.settings.theme;
    const language = ctx.settings.language;
    const dbPort = ctx.database.port;

    console.log(`🎯 Context access working:`);
    console.log(`   - Theme: ${theme} (type: ${typeof theme})`);
    console.log(`   - Language: ${language} (type: ${typeof language})`);
    console.log(`   - DB Port: ${dbPort} (type: ${typeof dbPort})`);

    return { id: args.id, name: 'John Doe' };
  }
});

// Test 4: Exécuter la query
console.log('\n📋 Test 4: Executing query...');
getUser({ id: '123-456-789' })
  .then(result => {
    if (result.isSuccess()) {
      console.log('✅ Query executed successfully:', result.value);
    } else {
      console.log('❌ Query failed:', result.error.message);
    }
  })
  .catch(error => {
    console.log('❌ Query execution error:', error.message);
  });

// Test 5: Extension du contexte
console.log('\n📋 Test 5: Context extension...');
const extendedApi = api.addContext('session', {
  token: 'abc123',
  expiresAt: new Date(Date.now() + 3600000)
});

console.log('✅ Context extended successfully');

// Test 6: Mutation test
console.log('\n📋 Test 6: Creating mutation...');
const updateUser = mutation({
  args: z.object({
    id: z.string().uuid(),
    name: z.string().min(2).max(50)
  }),
  handler: async (args) => {
    console.log(`🔧 Updating user ${args.id} with name: ${args.name}`);
    return { id: args.id, name: args.name, updatedAt: new Date() };
  }
});

updateUser({ id: '123-456-789', name: 'Jane Doe' })
  .then(result => {
    if (result.isSuccess()) {
      console.log('✅ Mutation executed successfully:', result.value);
    } else {
      console.log('❌ Mutation failed:', result.error.message);
    }
  })
  .catch(error => {
    console.log('❌ Mutation execution error:', error.message);
  });

console.log('\n🎉 All tests completed!');