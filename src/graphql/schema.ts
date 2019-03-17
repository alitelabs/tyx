import { GraphQLScalarType, GraphQLSchema } from 'graphql';
import { GraphQLDate, GraphQLDateTime, GraphQLTime } from 'graphql-iso-date';
import { ILogger, makeExecutableSchema } from 'graphql-tools';
import { Logger } from '../logger';
import { ApiMetadata } from '../metadata/api';
import { DatabaseMetadata } from '../metadata/database';
import { EntityMetadata } from '../metadata/entity';
import { MethodMetadata } from '../metadata/method';
import { Metadata, MetadataRegistry } from '../metadata/registry';
import { RelationType } from '../metadata/relation';
import { EnumMetadata, GraphKind, TypeMetadata, VarMetadata } from '../metadata/type';
import { CoreInfoSchema } from '../schema/core';
import '../schema/registry';
import { Class } from '../types/core';
import { Utils } from '../utils';
import { SchemaResolver } from './types';

import GraphQLJSON = require('graphql-type-json');
import FS = require('fs');

export { GraphQLSchema } from 'graphql';

const ENTITY = '';
const GET = '';
const SEARCH = '';
const ARGS = '';
const CREATE = 'create';
const UPDATE = 'update';
const REMOVE = 'remove';

const SCALARS: Record<string, GraphQLScalarType> = {
  Date: GraphQLDate,
  Time: GraphQLTime,
  DateTime: GraphQLDateTime,
  JSON: GraphQLJSON,
  ANY: new GraphQLScalarType({
    name: 'ANY',
    serialize(value) { return value; },
  }),
};

const DEF_SCALARS = Object.keys(SCALARS).map(s => `scalar ${s}`).join('\n');

const DEF_DIRECTIVES = `
directive @metadata on OBJECT
directive @input on INPUT_OBJECT
directive @type on OBJECT
directive @entity on OBJECT
directive @expression on INPUT_OBJECT
directive @auth(api: String, method: String, roles: JSON) on FIELD_DEFINITION
directive @crud(auth: JSON) on FIELD_DEFINITION
directive @transient on FIELD_DEFINITION
directive @relation(type: RelationType) on FIELD_DEFINITION
`.trim();

const DIRECTIVES = {
  // entity: ToolkitVisitor,
  // column: RelationVisitor,
  // query: QueryVisitor,
  // relation: RelationVisitor
};

export interface DatabaseSchema {
  metadata: DatabaseMetadata;
  name: string;
  alias: string;
  query: string;
  meta: string;
  model: string;
  entities: Record<string, EntitySchema>;
  root: SchemaResolver;
  queries: Record<string, SchemaResolver>;
  mutations: Record<string, SchemaResolver>;
}

export interface EntitySchema {
  metadata: EntityMetadata;
  name: string;

  query: string;
  mutation: string;
  model: string;
  inputs: string[];
  search: string;
  simple: string;
  // TODO: Remove
  relations: Record<string, { target: string, type: string }>;

  resolvers: Record<string, SchemaResolver>;
}

export interface TypeSchema {
  metadata: TypeMetadata;
  name: string;

  model: string;
  // query: string;
  params: string;
  // registry: SchemaResolver;
  resolvers: Record<string, SchemaResolver>;
}

export interface ApiSchema {
  metadata: ApiMetadata;
  api: string;
  queries: Record<string, MethodSchema>;
  mutations: Record<string, MethodSchema>;
  resolvers: Record<string, MethodSchema>;
}

export interface MethodSchema {
  metadata: MethodMetadata;
  api: string;
  host: string;
  method: string;
  name: string;
  signature: string;
  extension: string;
  resolver: SchemaResolver;
}

export interface EnumSchema {
  metadata: EnumMetadata;
  name: string;
  model: string;
  script: string;
}

export class CoreSchema {

  private static log: Logger = Logger.get('TYX', CoreSchema.name);

  private crud: boolean;

  public enums: Record<string, EnumSchema> = {};
  public metadata: Record<string, TypeSchema> = {};
  public databases: Record<string, DatabaseSchema> = {};
  public inputs: Record<string, TypeSchema> = {};
  public types: Record<string, TypeSchema> = {};
  public entities: Record<string, EntitySchema> = {};
  public apis: Record<string, ApiSchema> = {};

  constructor(registry: MetadataRegistry, crud: boolean) {
    this.crud = crud;

    // Enums
    for (const type of Object.values(registry.Enum)) {
      this.enums[type.name] = this.genEnum(type);
    }
    // Metadata
    for (const type of Object.values(registry.Registry)) {
      this.genType(type, this.metadata);
    }
    // Databases & Entities
    for (const type of Object.values(registry.Database)) {
      this.genDatabase(type);
    }
    // Unbound entites as types
    for (const type of Object.values(registry.Entity)) {
      if (this.entities[type.name]) continue;
      this.genType(type, this.types);
    }
    // Inputs
    for (const type of Object.values(registry.Input)) {
      this.genType(type, this.inputs);
    }
    // Results
    for (const type of Object.values(registry.Type)) {
      this.genType(type, this.types);
    }
    // Api
    for (const api of Object.values(registry.Api)) {
      this.genApi(api);
    }
  }

  public executable(logger?: ILogger): GraphQLSchema {
    try {
      return makeExecutableSchema({
        typeDefs: this.typeDefs(),
        resolvers: this.resolvers(),
        schemaDirectives: DIRECTIVES,
        logger,
      });
    } catch (err) {
      if (err.name === 'GraphQLError' && err.locations) {
        const loc = err.locations.map((item: any) => JSON.stringify(item)).join(',').replace(/"/g, '').replace(/,/g, ', ');
        err.message = err.message.replace('Error:', `Error: ${loc}`);
      }
      CoreSchema.log.error(err);
      throw err;
    }
  }

  public static prolog(): string {
    return Utils.unindent(`
      # -- Scalars --
      ${DEF_SCALARS}

      # -- Directives --
      ${DEF_DIRECTIVES}

      # -- Roots --
      schema {
        query: Query
        mutation: Mutation
      }
    `).trimLeft();
  }

  public typeDefs(): string {
    return Utils.unindent(`
            # -- Scalars --
            ${DEF_SCALARS}

            # -- Directives --
            ${DEF_DIRECTIVES}

            # -- Roots --
            schema {
              query: Query
              mutation: Mutation
            }
            type Query {
              Metadata: MetadataRegistry
              Core: CoreInfo
            }
            type Mutation {
              ping(input: ANY): ANY
            }

            # -- Enums --
            enum RelationType {
              OneToOne,
              OneToMany,
              ManyToOne,
              ManyToMany
            }
            ${Object.values(this.enums).sort((a, b) => a.name.localeCompare(b.name)).map(m => m.model).join('\n')}
      `).trimLeft()
      + Object.values(this.apis)
        .sort((a, b) => a.api.localeCompare(b.api))
        .map((api) => {
          let res = '';
          if (api.queries) {
            res += 'extend type Query {\n  ';
            res += Object.values(api.queries).map(q => q.name + q.signature).join('\n  ');
            res += '\n}\n';
          }
          if (api.mutations) {
            res += 'extend type Mutation {\n  ';
            res += Object.values(api.mutations).map(c => c.name + c.signature).join('\n  ');
            res += '\n}\n';
          }
          if (api.resolvers) {
            res += Object.values(api.resolvers).map(r => r.extension).join('\n') + '\n';
          }
          if (res) res = `# -- API: ${api.metadata.name} -- #\n` + res;
          return res;
        }).join('\n')
      + Object.values(this.databases).map((db) => {
        return `\n# -- Database: ${db.metadata.target.name} --\n`
          + `extend ${db.query}\n`
          + db.meta + '\n'
          + db.model + '\n'
          + Object.values(db.entities).map((e) => {
            return `\n# -- Entity: ${e.metadata.name} --\n`
              + (e.query ? `extend ${e.query}\n` : '')
              + (e.mutation ? `extend ${e.mutation}\n` : '')
              + `${e.model}\n${e.inputs.join('\n')}`;
          });
      }).join('\n')
      + '\n'
      + Object.values(this.inputs)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(i => `# -- Input: ${i.metadata.name} --\n${i.model}`).join('\n')
      + '\n'
      + Object.values(this.types)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(r => `# -- Type: ${r.metadata.name} --\n${r.model}`).join('\n')
      + '\n\n'
      + `# -- Metadata Types --\n`
      + Object.values(this.metadata)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(m => m.model).join('\n')
      + `\n`;
  }

  public resolvers() {
    const resolvers: any = { Query: { Metadata: undefined }, Mutation: { ping: undefined }, MetadataRegistry: {} };
    resolvers.Query.Metadata = () => {
      return Metadata.get();
    };
    resolvers.Query.Core = (obj: any, args: any, ctx: any) => {
      return CoreInfoSchema.get(ctx);
    };
    resolvers.Mutation.ping = (obj: any, args: any) => {
      return { args, stamp: new Date().toISOString(), version: process.versions };
    };
    for (const schema of Object.values(this.databases)) {
      resolvers.Query = { ...resolvers.Query, [schema.name]: schema.root };
      resolvers.Mutation = { ...resolvers.Mutation, ...schema.mutations };
      resolvers[schema.name] = schema.queries;
      for (const [name, entity] of Object.entries(schema.entities)) {
        resolvers[name + ENTITY] = entity.resolvers;
      }
    }
    for (const [target, schema] of Object.entries(this.metadata)) {
      resolvers[target] = schema.resolvers;
    }
    for (const api of Object.values(this.apis)) {
      if (api.queries) {
        for (const method of Object.values(api.queries)) {
          resolvers.Query[method.name] = method.resolver;
        }
      }
      if (api.mutations) {
        for (const method of Object.values(api.mutations)) {
          resolvers.Mutation[method.name] = method.resolver;
        }
      }
      if (api.resolvers) {
        for (const method of Object.values(api.resolvers)) {
          resolvers[method.host] = resolvers[method.host] || {};
          resolvers[method.host][method.name] = method.resolver;
        }
      }
    }
    return resolvers;
  }

  private genDatabase(metadata: DatabaseMetadata): DatabaseSchema {
    const meta: Record<string, EntityMetadata> = {};
    const typeName = metadata.target.name;
    const db: DatabaseSchema = {
      metadata,
      name: typeName,
      alias: metadata.alias,
      meta: `type ${typeName}Metadata {\n`,
      model: `type ${typeName} {\n  Metadata: ${typeName}Metadata\n}`,
      query: `type Query {\n  ${typeName}: ${typeName}\n}`,
      entities: {},
      root: () => ({}),
      queries: {
        Metadata: () => meta,
      },
      mutations: {},
    };
    for (const entity of metadata.entities) {
      db.meta += `  ${entity.name}: EntityMetadata\n`;
      meta[entity.name] = entity;
      this.genEntity(db, entity);
    }
    db.meta += '}';
    return this.databases[db.name] = db;
  }

  private genEntity(db: DatabaseSchema, metadata: EntityMetadata): EntitySchema {
    const name = metadata.name;
    if (db.entities[name]) return db.entities[name];

    let model = `type ${name}${ENTITY} @entity {`;
    let partial = `PartialExpr @expression {`;
    let nil = `NullExpr @expression {`;
    let multi = `MultiExpr @expression {`;
    let like = `LikeExpr @expression {`;
    let order = `OrderExpr @expression {`;
    let create = `CreateRecord @record {`;
    let update = `UpdateRecord @record {`;
    let keys = '';
    let cm = true;
    for (const col of metadata.columns) {
      if (col.isTransient) continue;
      const pn = col.propertyName;
      let dt = col.build.gql;
      let nl = col.required ? '!' : '';
      if (pn.endsWith('Id')) dt = GraphKind.ID;
      model += `${cm ? '' : ','}\n  ${pn}: ${dt}${nl}`;
      if (col.isPrimary) keys += `${cm ? '' : ', '}${pn}: ${dt}${nl}`;
      partial += `${cm ? '' : ','}\n  ${pn}: ${dt}`;
      nil += `${cm ? '' : ','}\n  ${pn}: Boolean`;
      multi += `${cm ? '' : ','}\n  ${pn}: [${dt}!]`;
      like += `${cm ? '' : ','}\n  ${pn}: String`;
      order += `${cm ? '' : ','}\n  ${pn}: Int`;
      update += `${cm ? '' : ','}\n    ${pn}: ${dt}${col.isPrimary ? '!' : ''}`;
      if (col.isCreateDate || col.isUpdateDate || col.isVersion || col.isVirtual || col.isGenerated) nl = '';
      create += `${cm ? '' : ','}\n    ${pn}: ${dt}${nl}`;
      cm = false;
    }
    // Debug field
    // model += `,\n  _exclude: Boolean`;
    // model += `,\n  _debug: _DebugInfo`;
    const opers = [
      `if: ${ARGS}${name}PartialExpr`,
      `eq: ${ARGS}${name}PartialExpr`,
      `ne: ${ARGS}${name}PartialExpr`,
      `gt: ${ARGS}${name}PartialExpr`,
      `gte: ${ARGS}${name}PartialExpr`,
      `lt: ${ARGS}${name}PartialExpr`,
      `lte: ${ARGS}${name}PartialExpr`,
      `like: ${ARGS}${name}LikeExpr`,
      `nlike: ${ARGS}${name}LikeExpr`,
      `rlike: ${ARGS}${name}LikeExpr`,
      `in: ${ARGS}${name}MultiExpr`,
      `nin: ${ARGS}${name}MultiExpr`,
      `nil: ${ARGS}${name}NullExpr`, // TODO
      `not: ${ARGS}${name}WhereExpr`,
      `nor: ${ARGS}${name}WhereExpr`,
      `and: [${ARGS}${name}WhereExpr]`,
      `or: [${ARGS}${name}WhereExpr]`,
    ];
    let search = `\n    `
      + opers.join(',\n    ')
      + `,\n    order: ${ARGS}${name}OrderExpr,`
      + `\n    skip: Int,`
      + `\n    take: Int,`
      + `\n    exists: Boolean`;
    const where = `WhereExpr @expression {\n  `
      + opers.join(',\n  ');
    const queryExpr = 'QueryExpr @expression {' + search;
    search += `,\n    query: ${ARGS}${name}QueryExpr`;

    const temp = [queryExpr, where, partial, nil, multi, like, order];
    if (this.crud) {
      temp.push(create);
      temp.push(update);
    }
    const inputs = temp.map(x => `input ${ARGS}${name}${x}\n}`);

    let query = `type ${db.name} {\n`;
    query += `  ${GET}${name}(${keys}): ${name}${ENTITY} @crud(auth: {}),\n`;
    query += `  ${SEARCH}${name}s(${search}\n  ): [${name}${ENTITY}] @crud(auth: {})\n`;
    query += `}`;

    let mutation = 'type Mutation {\n';
    mutation += `  ${db.name}_${CREATE}${name}(record: ${ARGS}${name}CreateRecord): ${name}${ENTITY} @crud(auth: {}),\n`;
    mutation += `  ${db.name}_${UPDATE}${name}(record: ${ARGS}${name}UpdateRecord): ${name}${ENTITY} @crud(auth: {}),\n`;
    mutation += `  ${db.name}_${REMOVE}${name}(${keys}): ${name}${ENTITY} @crud(auth: {})\n`;
    mutation += '}';

    const schema: EntitySchema = {
      metadata,
      name: metadata.name,

      query,
      mutation: this.crud ? mutation : undefined,
      model,
      inputs,
      search,
      simple: model,
      relations: {},
      resolvers: {},
    };
    db.queries = {
      ...db.queries,
      [`${GET}${name}`]: (obj, args, ctx, info) => ctx.provider.get(metadata, obj, args, ctx, info),
      [`${SEARCH}${name}s`]: (obj, args, ctx, info) => ctx.provider.search(metadata, obj, args, ctx, info),
    };
    db.mutations = this.crud ? {
      ...db.mutations,
      [`${db.name}_${CREATE}${name}`]: (obj, args, ctx, info) => ctx.provider.create(metadata, obj, args.record, ctx, info),
      [`${db.name}_${UPDATE}${name}`]: (obj, args, ctx, info) => ctx.provider.update(metadata, obj, args.record, ctx, info),
      [`${db.name}_${REMOVE}${name}`]: (obj, args, ctx, info) => ctx.provider.remove(metadata, obj, args, ctx, info),
    } : db.mutations;
    db.entities[name] = schema;
    this.entities[name] = schema;

    let simple = model;
    const navigation: Record<string, SchemaResolver> = {};
    for (const relation of metadata.relations) {
      const property = relation.propertyName;
      const inverse = relation.inverseEntityMetadata.name;
      const rm = schema.relations[property] = { inverse } as any;
      // TODO: Subset of entities
      // if (!entities.find(e => e.name === target)) continue;
      if (relation.relationType === RelationType.ManyToOne) {
        rm.type = 'manyToOne';
        const args = '';
        model += `,\n  ${property}${args}: ${inverse}${ENTITY} @relation(type: ManyToOne)`;
        simple += `,\n  ${property}: ${inverse}${ENTITY}`;
        navigation[property] = (obj, args, ctx, info) => ctx.provider.manyToOne(metadata, relation, obj, args, ctx, info);
      } else if (relation.relationType === RelationType.OneToOne) {
        rm.type = 'oneToOne';
        const args = '';
        model += `,\n  ${property}${args}: ${inverse}${ENTITY} @relation(type: OneToOne)`;
        navigation[property] = (obj, args, ctx, info) => ctx.provider.oneToOne(metadata, relation, obj, args, ctx, info);
      } else if (relation.relationType === RelationType.OneToMany) {
        rm.type = 'oneToMany';
        const temp = this.genEntity(db, relation.inverseEntityMetadata);
        const args = ` (${temp.search}\n  )`;
        model += `,\n  ${property}${args}: [${inverse}${ENTITY}] @relation(type: OneToMany)`;
        navigation[property] = (obj, args, ctx, info) => ctx.provider.oneToMany(metadata, relation, obj, args, ctx, info);
      } else if (relation.relationType === RelationType.ManyToMany) {
        rm.type = 'manyToMany';
        const temp = this.genEntity(db, relation.inverseEntityMetadata);
        const args = ` (${temp.search}\n  )`;
        model += `,\n  ${property}${args}: [${inverse}${ENTITY}] @relation(type: ManyToMany)`;
        navigation[property] = (obj, args, ctx, info) => ctx.provider.manyToMany(metadata, relation, obj, args, ctx, info);
      }
    }
    for (const col of metadata.columns) {
      if (!col.isTransient) continue;
      const pn = col.propertyName;
      const nl = col.required ? '!' : '';
      model += `${cm ? '' : ','}\n  ${pn}: ${col.build.gql}${nl} @transient`;
    }
    model += '\n}';
    simple += '\n}';

    schema.model = model;
    schema.simple = simple;
    schema.resolvers = navigation;
    // schema.schema = query + "\n" + mutation + "\n" + model + "\n" + inputs.join("\n");

    return schema;
  }

  private genEnum(metadata: EnumMetadata): EnumSchema {
    let schema = this.enums[metadata.name];
    if (schema) return schema;
    let model = `enum ${metadata.name} {`;
    let script = `export enum ${metadata.name} {`;
    let i = 0;
    for (const key of metadata.options) {
      model += `${i ? ',' : ''}\n  ${key}`;
      script += `${i ? ',' : ''}\n  ${key} = '${key}'`;
      i++;
    }
    model += '\n}';
    script += '\n}';
    schema = { metadata, name: metadata.name, model, script };
    return schema;
  }

  private genType(metadata: VarMetadata, reg: Record<string, TypeSchema>): TypeSchema | EntitySchema {

    if (GraphKind.isScalar(metadata.kind)) return undefined;
    if (GraphKind.isEnum(metadata.kind)) return undefined;
    if (GraphKind.isRef(metadata.kind)) throw new TypeError('Unresolved reference');
    if (GraphKind.isArray(metadata.kind)) return this.genType(metadata.item, reg);

    const struc = metadata as TypeMetadata;
    if (reg[struc.name]) return reg[struc.name];
    if (this.entities[struc.gql]) return this.entities[struc.gql];

    if (!GraphKind.isStruc(struc.kind) || !struc.members) {
      throw new TypeError(`Empty type difinition ${struc.target}`);
    }

    // Generate schema
    const schema: TypeSchema = {
      metadata: struc,
      name: struc.name,

      model: undefined,
      params: undefined,
      resolvers: {},
    };
    reg[struc.name] = schema;
    schema.params = '';
    for (const field of Object.values(struc.members)) {
      const type = field.build;
      if (GraphKind.isStruc(type.kind) || GraphKind.isArray(type.kind)) continue;
      if (field.kind === GraphKind.Object) continue;
      schema.params += (schema.params ? ',\n    ' : '    ') + `${field.name}: ${field.kind}`;
    }
    const scope = metadata.kind;
    schema.model = (scope === GraphKind.Input)
      ? `input ${struc.name} @${scope.toString().toLowerCase()} {\n`
      : `type ${struc.name} @${scope.toString().toLowerCase()} {\n`;
    for (const member of Object.values(struc.members)) {
      const type = member.build;
      const doc = GraphKind.isVoid(member.kind) ? '# ' : '';
      if (GraphKind.isMetadata(struc.kind) && GraphKind.isArray(type.kind)) {
        const sch = !GraphKind.isScalar(type.item.kind) && reg[type.item.gql];
        const args = (sch && sch.params) ? `(\n${reg[type.item.gql].params}\n  )` : '';
        schema.model += `  ${doc}${member.name}${args}: ${type.gql}\n`;
      } else {
        const nl = member.required ? '!' : '';
        schema.model += `  ${doc}${member.name}: ${type.gql}${nl}\n`;
      }
      const resolvers = (struc.target as any).RESOLVERS;
      if (resolvers && resolvers[member.name]) schema.resolvers[member.name] = resolvers[member.name];
    }
    schema.model += '}';
    return schema;
  }

  private genApi(metadata: ApiMetadata): ApiSchema {
    const api: ApiSchema = {
      metadata,
      api: metadata.name,
      queries: undefined,
      mutations: undefined,
      resolvers: undefined,
    };
    for (const method of Object.values(metadata.methods)) {
      if (!method.query && !method.mutation && !method.resolver) continue;
      const input = method.input.build;
      const result = method.result.build;
      const name = method.resolver ? method.name : `${metadata.target.name}_${method.name}`;
      // TODO: Get it from typedef
      const arg = (method.resolver ? method.design[1].name : method.design[0].name) || 'input';
      const call = GraphKind.isVoid(input.kind) ? `: ${result.gql}` : `(${arg}: ${input.gql}!): ${result.gql}`;
      const dir = ` @auth(api: "${method.api.name}", method: "${method.name}", roles: ${Utils.scalar(method.roles)})`;
      const host: Class = method.host && method.host();
      const meth: MethodSchema = {
        metadata: method,
        api: metadata.name,
        host: host && host.name,
        method: method.name,
        name,
        signature: call + dir,
        extension: undefined,
        // TODO: Move resolver functions to this.resolvers()
        resolver: (obj, args, ctx, info) => {
          return ctx.container.resolve(meth, obj, args[arg], ctx, info);
        }
      };
      if (method.mutation) {
        api.mutations = api.mutations || {};
        api.mutations[method.name] = meth;
      } else if (method.query) {
        api.queries = api.queries || {};
        api.queries[method.name] = meth;
      } else if (method.resolver) {
        meth.extension = `extend type ${host.name} {\n  ${method.name}${call}${dir}\n}`;
        api.resolvers = api.resolvers || {};
        api.resolvers[method.name] = meth;
      }
    }
    this.apis[api.api] = api;
    return api;
  }

  public write(file: string) {
    FS.writeFileSync(file, this.typeDefs());
  }
}
