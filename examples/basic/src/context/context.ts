// // ==========================================
// // UTILS
// // ==========================================

// // Transforme une union en intersection
// type UnionToIntersection<U> = 
//   (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;

// // ==========================================
// // CONTEXTE INITIAL
// // ==========================================
// type CtxInitial = {
//   user: { id: string; email: string };
//   db: { challenges: { create: (d: any) => void } };
// };

// // ==========================================
// // EXTENSIONS
// // ==========================================
// type Extension = {
//   context: object;
//   // functions?: (ctx: any) => Record<string, any>; // Ignoré ici pour focus sur le contexte
// };

// // Fusion des contextes des extensions
// type MergeExtensionContexts<Exts extends Extension[]> =
//   UnionToIntersection<Exts[number]['context']>;

// // Contexte final fusionné
// type CtxFinal<Ctx, Exts extends Extension[]> = 
//   Ctx & MergeExtensionContexts<Exts>;

// // ==========================================
// // EXEMPLES D’EXTENSIONS
// // ==========================================
// type Ext1 = { context: { logger: { level: 'info' } } };
// type Ext2 = { context: { config: { debug: boolean } } };

// // ==========================================
// // UTILISATION
// // ==========================================
// type FinalCtx = CtxFinal<CtxInitial, [Ext1, Ext2]>;

// /*
// FinalCtx =
// {
//   user: { id: string; email: string };
//   db: { challenges: { create: (d: any) => void } };
// } &
// {
//   logger: { level: 'info' };
// } &
// {
//   config: { debug: boolean };
// }
// */

// // Exemple d'objet concret respectant FinalCtx
// const ctx: FinalCtx = {
//   user: { id: '123', email: 'admin@deesse.art' },
//   db: { challenges: { create: (d: any) => console.log(d) } },
//   logger: { level: 'info' },
//   config: { debug: true },
// };

// console.log(ctx.user.email);   // admin@deesse.art
// console.log(ctx.logger.level); // info
// console.log(ctx.config.debug); // true
