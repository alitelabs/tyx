import 'reflect-metadata';

if (Symbol['asyncIterator'] === undefined) ((Symbol as any)['asyncIterator']) = Symbol.for('asyncIterator');

// --- types/index.ts ----

export * from './types/core';
export * from './types/http';
export * from './types/config';
export * from './types/security';
export * from './types/event';
export * from './types/proxy';
export * from './types/graphql';

// ---- metadata/index.ts ---

export * from './metadata/api';
export * from './metadata/service';
export * from './metadata/proxy';
export * from './metadata/method';
export * from './metadata/type';
export * from './metadata/entity';
export * from './metadata/column';
export * from './metadata/relation';
export * from './metadata/database';
export * from './metadata/registry';

// --- decorators/index.ts ---

export * from './decorators/api';
export * from './decorators/service';
export * from './decorators/proxy';
export * from './decorators/auth';
export * from './decorators/resolver';
export * from './decorators/http';
export * from './decorators/event';
export * from './decorators/type';
export * from './decorators/entity';
export * from './decorators/column';
export * from './decorators/relation';
export * from './decorators/database';
export * from './decorators/exception';

// ---- core/index.ts ----

export * from './core/core';
export * from './core/config';
export * from './core/security';
export * from './core/service';
export * from './core/proxy';
export * from './core/provider';
export * from './core/schema';
export * from './core/graphql';

// --- TODO ---

export * from './logger';
export * from './errors';
export * from './utils';
export * from './aws';
export * from './express';
export * from './graphql';

export { Orm, Di, GraphQL } from './import';
