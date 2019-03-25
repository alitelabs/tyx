import { GraphQLScalarType, GraphQLSchema } from 'graphql';
import { GraphQLDate, GraphQLDateTime, GraphQLTime } from 'graphql-iso-date';
import { ILogger, makeExecutableSchema } from 'graphql-tools';
import { Logger } from '../logger';
import { ApiMetadata } from '../metadata/api';
import { DatabaseMetadata } from '../metadata/database';
import { EntityMetadata } from '../metadata/entity';
import { EnumMetadata } from '../metadata/enum';
import { MethodMetadata } from '../metadata/method';
import { Metadata } from '../metadata/registry';
import { RelationType } from '../metadata/relation';
import { TypeMetadata } from '../metadata/type';
import { VarKind, VarMetadata } from '../metadata/var';
import { Class } from '../types/core';
import { Roles } from '../types/security';
import { Utils } from '../utils';

import Reg = require('../schema/registry');
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
directive @record on INPUT_OBJECT
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

interface DatabaseSchema {
  metadata: DatabaseMetadata;
  name: string;
  alias: string;
  query: string;
  meta: string;
  model: string;
  entities: Record<string, EntitySchema>;

  root: string;
  queries: Record<string, string>;
  mutations: Record<string, string>;
}

interface EntitySchema {
  metadata: EntityMetadata;
  name: string;
  query: string;
  mutation: string;
  model: string;
  inputs: string[];
  search: string;
  simple: string;

  resolvers: Record<string, string>;
}

interface TypeSchema {
  metadata: TypeMetadata;
  name: string;
  model: string;
  params: string;

  resolvers: Record<string, string>;
}

interface ApiSchema {
  metadata: ApiMetadata;
  name: string;
  queries: Record<string, MethodSchema>;
  mutations: Record<string, MethodSchema>;
  extensions: Record<string, MethodSchema>;
}

interface MethodSchema {
  metadata: MethodMetadata;
  api: string;
  host: string;
  method: string;
  name: string;
  signature: string;
  extension: string;

  resolver: string;
}

interface EnumSchema {
  metadata: EnumMetadata;
  name: string;
  model: string;
}

export class CoreSchema {

  private static log: Logger = Logger.get('TYX', CoreSchema.name);

  private crud: boolean;

  protected enums: Record<string, EnumSchema> = {};
  protected metadata: Record<string, TypeSchema> = {};
  protected inputs: Record<string, TypeSchema> = {};
  protected types: Record<string, TypeSchema> = {};
  protected databases: Record<string, DatabaseSchema> = {};
  protected entities: Record<string, EntitySchema> = {};
  protected apis: Record<string, ApiSchema> = {};

  constructor(crud?: boolean);
  constructor(registry: Metadata | typeof Metadata);
  constructor(registry: Metadata | typeof Metadata, crud: boolean);
  constructor(registryOrCrud?: Metadata | typeof Metadata | boolean, maybeCrud?: boolean) {
    const registry = typeof registryOrCrud !== 'boolean' && registryOrCrud || Reg && Metadata.validate();
    this.crud = typeof registryOrCrud === 'boolean' ? registryOrCrud : !!maybeCrud;

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
      const typeDefs = this.typeDefs();
      const resolvers = this.resolvers();
      return makeExecutableSchema({
        typeDefs,
        resolvers,
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
    return `
      # -- Scalars --
      ${DEF_SCALARS}

      # -- Directives --
      ${DEF_DIRECTIVES}

      # -- Roots --
      schema {
        query: Query
        mutation: Mutation
      }
    `;
  }

  public static service(name: string, roles?: Roles, crud?: boolean, tabs?: any): string {
    const schema = new CoreSchema(crud);
    const auth = Object.entries(roles || { Public: true }).map(e => `${e[0]}: ${e[1]}`).join(', ');
    let script = '';
    script += Utils.unindent(`
      import { DocumentNode } from 'graphql';
      import { Auth, Context, CoreGraphQL, gql, HttpRequest, HttpResponse, Override, Resolver, Service } from 'tyx';
    `).trimRight() + '\n';
    script += Utils.unindent(`
      @Service(true)
      export class ${name}GraphQL extends CoreGraphQL {

        public constructor() {
          super(TYPE_DEFS, RESOLVERS);
        }

        @Override()
        @Auth({ ${auth} })
        public async graphql(ctx: Context, req: HttpRequest): Promise<HttpResponse> {
          return super.graphql(ctx, req);
        }

        public async playground(ctx: Context, req: HttpRequest): Promise<string> {
          return super.playground(ctx, req, PLAYGROUND_TABS);
        }
      }
    `) + '\n';
    // script += `export const DIRECTIVES: any = {};\n\n`;
    script += `export const TYPE_DEFS: DocumentNode = gql\`\n${Utils.unindent(schema.typeDefs(), '  ')}\`;\n\n`;
    script += `export const RESOLVERS: Record<string, Record<string, Resolver>> = ${Utils.unindent(schema.script(true), '')};\n\n`;
    script += '// tslint:disable:object-literal-key-quotes\n';
    script += `export const PLAYGROUND_TABS: any = `;
    script += tabs ? JSON.stringify(tabs, null, 2) : 'undefined';
    script += ';\n';
    return script;
  }

  public typeDefs(): string {
    let schema = CoreSchema.prolog().trimRight();
    schema += `
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
    `;

    // Enums
    schema += Object.values(this.enums)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(m => m.model).join('\n') + '\n';

    // Apis
    schema += Object.values(this.apis)
      .sort((a, b) => a.name.localeCompare(b.name))
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
        if (api.extensions) {
          res += Object.values(api.extensions).map(r => r.extension).join('\n') + '\n';
        }
        if (res) res = `# -- API: ${api.metadata.name} -- #\n` + res;
        return res;
      }).join('\n');

    // Databases
    schema += Object.values(this.databases).map((db) => {
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
    }).join('\n') + '\n';

    // Inputs
    schema += Object.values(this.inputs)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(i => `# -- Input: ${i.metadata.name} --\n${i.model}`).join('\n')
      + '\n';

    // Types
    schema += Object.values(this.types)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(r => `# -- Type: ${r.metadata.name} --\n${r.model}`).join('\n')
      + '\n\n';

    // Metadata
    schema += `# -- Metadata Types --\n`
      + Object.values(this.metadata)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(m => m.model).join('\n')
      + `\n`;

    return Utils.unindent(schema).trimLeft();
  }

  public resolvers() {
    const script = this.script();
    // tslint:disable-next-line:no-function-constructor-with-string-args
    const factory = new Function(`return ${script}`);
    const map = factory.call(null);
    return map;
  }

  public directives() {
    return DIRECTIVES;
  }

  public script(ts?: boolean) {
    const resolvers: Record<string, Record<string, string>> = {
      Query: { Metadata: undefined },
      Mutation: { ping: undefined },
      MetadataRegistry: {}
    };
    resolvers.Query.Metadata = `ctx.metadata`;
    resolvers.Query.Core = `ctx.container`;
    resolvers.Mutation.ping = `({ args, timestamp: new Date().toISOString(), version: process.versions })`;
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
      if (api.extensions) {
        for (const method of Object.values(api.extensions)) {
          resolvers[method.host] = resolvers[method.host] || {};
          resolvers[method.host][method.name] = method.resolver;
        }
      }
    }

    let script = '{\n';
    for (const key in resolvers) {
      script += `  ${key}: {\n`;
      const group = resolvers[key];
      for (const res in group) {
        if (ts) {
          // script += `    ${res}(obj, args, ctx, info) { return ${group[res]}; },\n`;
          script += `    ${res}: (obj, args, ctx, info) => ${group[res]},\n`;
        } else {
          script += `    ${res}: (obj, args, ctx, info) => ${group[res]},\n`;
        }
      }
      script += `  },\n`;
    }
    script += '}';
    return script;
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
      root: '{}',
      queries: {
        Metadata: `ctx.metadata.Database['${metadata.name}']`,
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
      let nl = col.mandatory ? '!' : '';
      if (pn.endsWith('Id')) dt = VarKind.ID;
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
      // relations: {},
      resolvers: {},
    };
    db.queries = {
      ...db.queries,
      [`${GET}${name}`]: `ctx.provider.get('${db.name}.${metadata.name}', obj, args, ctx, info)`,
      [`${SEARCH}${name}s`]: `ctx.provider.search('${db.name}.${metadata.name}', obj, args, ctx, info)`
    };
    db.mutations = this.crud ? {
      ...db.mutations,
      [`${db.name}_${CREATE}${name}`]: `ctx.provider.create('${db.name}.${metadata.name}', obj, args.record, ctx, info)`,
      [`${db.name}_${UPDATE}${name}`]: `ctx.provider.update('${db.name}.${metadata.name}', obj, args.record, ctx, info)`,
      [`${db.name}_${REMOVE}${name}`]: `ctx.provider.remove('${db.name}.${metadata.name}', obj, args, ctx, info)`,
    } : db.mutations;
    db.entities[name] = schema;
    this.entities[name] = schema;

    let simple = model;
    const navigation: Record<string, string> = {};
    for (const relation of metadata.relations) {
      const property = relation.propertyName;
      const inverse = relation.inverseEntityMetadata.name;
      const rm = /* schema.relations[property] = */ { inverse } as any;
      // TODO: Subset of entities
      // if (!entities.find(e => e.name === target)) continue;
      if (relation.relationType === RelationType.ManyToOne) {
        rm.type = 'manyToOne';
        const args = '';
        model += `,\n  ${property}${args}: ${inverse}${ENTITY} @relation(type: ManyToOne)`;
        simple += `,\n  ${property}: ${inverse}${ENTITY}`;
        navigation[property] = `ctx.provider.manyToOne('${db.name}.${metadata.name}', '${relation.name}', obj, args, ctx, info)`;
      } else if (relation.relationType === RelationType.OneToOne) {
        rm.type = 'oneToOne';
        const args = '';
        model += `,\n  ${property}${args}: ${inverse}${ENTITY} @relation(type: OneToOne)`;
        navigation[property] = `ctx.provider.oneToOne('${db.name}.${metadata.name}', '${relation.name}', obj, args, ctx, info)`;
      } else if (relation.relationType === RelationType.OneToMany) {
        rm.type = 'oneToMany';
        const temp = this.genEntity(db, relation.inverseEntityMetadata);
        const args = ` (${temp.search}\n  )`;
        model += `,\n  ${property}${args}: [${inverse}${ENTITY}] @relation(type: OneToMany)`;
        navigation[property] = `ctx.provider.oneToMany('${db.name}.${metadata.name}', '${relation.name}', obj, args, ctx, info)`;
      } else if (relation.relationType === RelationType.ManyToMany) {
        rm.type = 'manyToMany';
        const temp = this.genEntity(db, relation.inverseEntityMetadata);
        const args = ` (${temp.search}\n  )`;
        model += `,\n  ${property}${args}: [${inverse}${ENTITY}] @relation(type: ManyToMany)`;
        navigation[property] = `ctx.provider.manyToMany('${db.name}.${metadata.name}', '${relation.name}', obj, args, ctx, info)`;
      }
    }
    for (const col of metadata.columns) {
      if (!col.isTransient) continue;
      const pn = col.propertyName;
      const nl = col.mandatory ? '!' : '';
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
    let i = 0;
    for (const key of metadata.options) {
      model += `${i ? ',' : ''}\n  ${key}`;
      i++;
    }
    model += '\n}';
    schema = { metadata, name: metadata.name, model };
    return schema;
  }

  private genType(metadata: VarMetadata, reg: Record<string, TypeSchema>): TypeSchema | EntitySchema {

    if (VarKind.isScalar(metadata.kind)) return undefined;
    if (VarKind.isEnum(metadata.kind)) return undefined;
    if (VarKind.isRef(metadata.kind)) throw new TypeError('Unresolved reference');
    if (VarKind.isArray(metadata.kind)) return this.genType(metadata.item, reg);

    const struc = metadata as TypeMetadata;
    if (reg[struc.name]) return reg[struc.name];
    if (this.entities[struc.gql]) return this.entities[struc.gql];

    if (!VarKind.isStruc(struc.kind) || !struc.members) {
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
      if (VarKind.isStruc(type.kind) || VarKind.isArray(type.kind)) continue;
      if (field.kind === VarKind.Object) continue;
      schema.params += (schema.params ? ',\n    ' : '    ') + `${field.name}: ${field.kind}`;
    }
    const scope = metadata.kind;
    schema.model = (scope === VarKind.Input)
      ? `input ${struc.name} @${scope.toString().toLowerCase()} {\n`
      : `type ${struc.name} @${scope.toString().toLowerCase()} {\n`;
    for (const member of Object.values(struc.members)) {
      const type = member.build;
      const doc = VarKind.isVoid(member.kind) ? '# ' : '';
      if (VarKind.isMetadata(struc.kind) && VarKind.isArray(type.kind)) {
        const sch = !VarKind.isScalar(type.item.kind) && reg[type.item.gql];
        const args = (sch && sch.params) ? `(\n${reg[type.item.gql].params}\n  )` : '';
        schema.model += `  ${doc}${member.name}${args}: ${type.gql}\n`;
      } else {
        const nl = member.mandatory ? '!' : '';
        schema.model += `  ${doc}${member.name}: ${type.gql}${nl}\n`;
      }
      const resolvers = (struc.target as any).RESOLVERS;
      if (resolvers && resolvers[member.name]) {
        schema.resolvers[member.name] = `ctx.metadata.resolve('${metadata.name}', '${member.name}', obj, args, ctx, info)`;
      }
    }
    schema.model += '}';
    return schema;
  }

  private genApi(metadata: ApiMetadata): ApiSchema {
    const api: ApiSchema = {
      metadata,
      name: metadata.name,
      queries: undefined,
      mutations: undefined,
      extensions: undefined,
    };
    for (const method of Object.values(metadata.methods)) {
      if (!method.query && !method.mutation && !method.extension) continue;
      const result = method.result.build;
      const name = method.extension ? method.name : `${metadata.target.name}_${method.name}`;

      let call = '';
      for (let i = 0; i < method.inputs.length; i++) {
        if (VarKind.isVoid(method.inputs[i].kind) || VarKind.isResolver(method.inputs[i].kind)) continue;
        // TODO: Move to metadata
        const name = method.inputs[i].name || `arg${i}`;
        if (!method.inputs[i]) throw new TypeError(`Unbound input argmument [${method.api.name}.${method.name}:${i}] [${name}]`);
        const inb = method.inputs[i].build;
        call += (call ? ', ' : '') + `${name}: ${inb.gql}!`;
      }
      if (call) call = `(${call})`;
      call += `: ${result.gql}`;

      const dir = ` @auth(api: "${method.api.name}", method: "${method.name}", roles: ${Utils.scalar(method.roles)})`;
      const host: Class = method.scope && method.scope();
      const meth: MethodSchema = {
        metadata: method,
        api: metadata.name,
        host: host && host.name,
        method: method.name,
        name,
        signature: call + dir,
        extension: undefined,
        // TODO: Move resolver functions to this.resolvers()
        resolver: `ctx.resolve('${method.api.name}.${method.name}', obj, args, ctx, info)`
      };
      if (method.mutation) {
        api.mutations = api.mutations || {};
        api.mutations[method.name] = meth;
      } else if (method.query) {
        api.queries = api.queries || {};
        api.queries[method.name] = meth;
      } else if (method.extension) {
        meth.extension = `extend type ${host.name} {\n  ${method.name}${call}${dir}\n}`;
        api.extensions = api.extensions || {};
        api.extensions[method.name] = meth;
      }
    }
    this.apis[api.name] = api;
    return api;
  }

  public write(file: string) {
    FS.writeFileSync(file, this.typeDefs());
  }
}
