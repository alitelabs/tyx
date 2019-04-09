import 'reflect-metadata';
import 'typedi';

if (Symbol['asyncIterator'] === undefined) ((Symbol as any)['asyncIterator']) = Symbol.for('asyncIterator');

// --- types/index.ts ----

export * from './types/core';
export * from './types/http';
export * from './types/config';
export * from './types/security';
export * from './types/event';
export * from './types/proxy';
export * from './types/graphql';
export * from './types/thrift';

// ---- metadata/index.ts ---

export * from './metadata/api';
export * from './metadata/service';
export * from './metadata/proxy';
export * from './metadata/method';
export * from './metadata/http';
export * from './metadata/event';
export * from './metadata/var';
export * from './metadata/enum';
export * from './metadata/input';
export * from './metadata/result';
export * from './metadata/field';
export * from './metadata/type';
export * from './metadata/entity';
export * from './metadata/column';
export * from './metadata/relation';
export * from './metadata/indexes';
export * from './metadata/database';
export * from './metadata/registry';

// --- decorators/index.ts ---

export * from './decorators/api';
export * from './decorators/service';
export * from './decorators/proxy';
export * from './decorators/auth';
export * from './decorators/method';
export * from './decorators/http';
export * from './decorators/event';
export * from './decorators/type';
export * from './decorators/entity';
export * from './decorators/column';
export * from './decorators/relation';
export * from './decorators/indexes';
export * from './decorators/database';
export * from './decorators/exception';

// ---- general/index.ts ----

export * from './errors';
export * from './logger';
export * from './utils';

// ---- core/index.ts ----

export * from './core/core';
export * from './core/config';
export * from './core/security';
export * from './core/proxy';
export * from './core/graphql';
export * from './core/thrift';
export * from './core/server';

// ---- orm/index.ts ----

export * from './orm/typeorm';
export * from './orm/provider';

// ---- tools/index.ts ---

export * from './tools/graphql';
export * from './tools/tag';
export * from './tools/angular';
export * from './tools/thrift';

// --- TODO ---

export * from './aws';
export * from './import';
