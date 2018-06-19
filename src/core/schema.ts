import { GraphQLScalarType, GraphQLSchema } from 'graphql';
import { GraphQLDate, GraphQLDateTime, GraphQLTime } from 'graphql-iso-date';
import { ILogger, makeExecutableSchema } from 'graphql-tools';
import { SchemaResolver } from '../graphql/types';
import { back, scalar } from '../graphql/utils';
import { QueryVisitor, RelationVisitor } from '../graphql/visitors';
import { ApiMetadata } from '../metadata/api';
import { DatabaseMetadata } from '../metadata/database';
import { EntityMetadata } from '../metadata/entity';
import { MethodMetadata } from '../metadata/method';
import { Metadata } from '../metadata/registry';
import { RelationType } from '../metadata/relation';
import { EnumMetadata, GraphKind, TypeMetadata, VarMetadata } from '../metadata/type';
import '../schema/registry';
import GraphQLJSON = require('graphql-type-json');

export { GraphQLSchema } from 'graphql';

const ENTITY = '';
const GET = '';
const SEARCH = '';
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
directive @input on OBJECT
directive @type on OBJECT
directive @entity on OBJECT
directive @expression on OBJECT
directive @crud(auth: JSON) on FIELD_DEFINITION
directive @query(auth: JSON) on FIELD_DEFINITION
directive @mutation(auth: JSON) on FIELD_DEFINITION
directive @relation(type: RelationType) on FIELD_DEFINITION
`.trim();

const DIRECTIVES = {
  // entity: ToolkitVisitor,
  // column: RelationVisitor,
  query: QueryVisitor,
  relation: RelationVisitor,
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
  public enums: Record<string, EnumSchema> = {};
  public metadata: Record<string, TypeSchema> = {};
  public databases: Record<string, DatabaseSchema> = {};
  public inputs: Record<string, TypeSchema> = {};
  public types: Record<string, TypeSchema> = {};
  public entities: Record<string, EntitySchema> = {};
  public apis: Record<string, ApiSchema> = {};

  constructor() {
    Metadata.validate();
    // Enums
    for (const type of Object.values(Metadata.EnumMetadata)) {
      this.enums[type.name] = this.genEnum(type);
    }
    // Metadata
    for (const type of Object.values(Metadata.RegistryMetadata)) {
      this.genType(type, this.metadata);
    }
    // Databases & Entities
    for (const type of Object.values(Metadata.DatabaseMetadata)) {
      this.genDatabase(type);
    }
    // Inputs
    for (const type of Object.values(Metadata.InputMetadata)) {
      this.genType(type, this.inputs);
    }
    // Results
    for (const type of Object.values(Metadata.TypeMetadata)) {
      this.genType(type, this.types);
    }
    // Api
    for (const api of Object.values(Metadata.ApiMetadata)) {
      this.genApi(api);
    }
  }

  public executable(logger?: ILogger): GraphQLSchema {
    return makeExecutableSchema({
      typeDefs: this.typeDefs(),
      resolvers: this.resolvers(),
      schemaDirectives: DIRECTIVES,
      logger,
    });
  }

  public static prolog(): string {
    return back(`
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
    return back(`
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
            }
            type Mutation {
              ping(input: ANY): ANY
            }

            # -- Enums --
            enum RelationType {
              OneToOne,
              OneToMany,
              ManyToOne
            }
            ${Object.values(this.enums).map(m => m.model).join('\n')}
      `).trimLeft()
      + Object.values(this.apis).map((api) => {
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
        if (res) res = `\# -- API: ${api.metadata.alias} --#\n` + res;
        return res;
      }).join('\n')
      + Object.values(this.databases).map((db) => {
        return `\n# -- Database: ${db.metadata.target.name} --\n`
          + `extend ${db.query}\n`
          + db.meta + '\n'
          + db.model + '\n'
          + Object.values(db.entities).map((e) => {
            return `\n# -- Entity: ${e.metadata.name} --\n`
              + `extend ${e.query}\n`
              + `extend ${e.mutation}\n`
              + `${e.model}\n${e.inputs.join('\n')}`;
          });
      }).join('\n')
      + '\n'
      + Object.values(this.inputs).map(i => `# -- Input: ${i.metadata.name} --\n${i.model}`).join('\n')
      + '\n'
      + Object.values(this.types).map(r => `# -- Type: ${r.metadata.name} --\n${r.model}`).join('\n')
      + '\n\n'
      + `# -- Metadata Types --\n`
      + Object.values(this.metadata).map(m => m.model).join('\n')
      + `\n`;
  }

  public resolvers() {
    const resolvers: any = { Query: { Metadata: undefined }, Mutation: { ping: undefined }, MetadataRegistry: {} };
    resolvers.Query.Metadata = () => {
      return Metadata.get();
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
    let input = `Input @expression {`;
    let nil = `Null @expression {`;
    let multi = `Multi @expression {`;
    let like = `Like @expression {`;
    let order = `Order @expression {`;
    let keys = '';
    let create = `Create @record {`;
    let update = `Update @record {`;
    let cm = true;
    for (const col of metadata.columns) {
      if (col.isTransient) continue;
      const pn = col.propertyName;
      let dt = col.kind;
      let nl = col.required ? '!' : '';
      if (pn.endsWith('Id')) dt = GraphKind.ID;
      model += `${cm ? '' : ','}\n  ${pn}: ${dt}${nl}`;
      if (col.isPrimary) keys += `${cm ? '' : ', '}${pn}: ${dt}${nl}`;
      input += `${cm ? '' : ','}\n  ${pn}: ${dt}`;
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
      `if: ${name}Input`,
      `eq: ${name}Input`,
      `ne: ${name}Input`,
      `gt: ${name}Input`,
      `gte: ${name}Input`,
      `lt: ${name}Input`,
      `lte: ${name}Input`,
      `like: ${name}Like`,
      `nlike: ${name}Like`,
      `rlike: ${name}Like`,
      `in: ${name}Multi`,
      `nin: ${name}Multi`,
      `not: ${name}Where`,
      `nor: ${name}Where`,
      `nil: ${name}Null`, // TODO
      `and: [${name}Where]`,
      `or: [${name}Where]`,
    ];
    let search = `\n    `
      + opers.join(',\n    ')
      + `,\n    order: ${name}Order,`
      + `\n    skip: Int,`
      + `\n    take: Int,`
      + `\n    exists: Boolean`;
    const where = `Where @expression {\n  `
      + opers.join(',\n  ');
    const find = 'Query @expression {' + search;
    search += `,\n    query: ${name}Query`;

    const inputs = [create, update, input, find, where, nil, multi, like, order].map(x => `input ${name}${x}\n}`);

    let query = `type ${db.name} {\n`;
    query += `  ${GET}${name}(${keys}): ${name}${ENTITY} @crud(auth: {}),\n`;
    query += `  ${SEARCH}${name}s(${search}\n  ): [${name}${ENTITY}] @crud(auth: {})\n`;
    query += `}`;
    let mutation = 'type Mutation {\n';
    mutation += `  ${db.name}_${CREATE}${name}(record: ${name}Create): ${name}${ENTITY} @crud(auth: {}),\n`;
    mutation += `  ${db.name}_${UPDATE}${name}(record: ${name}Update): ${name}${ENTITY} @crud(auth: {}),\n`;
    mutation += `  ${db.name}_${REMOVE}${name}(${keys}): ${name}${ENTITY} @crud(auth: {})\n`;
    mutation += '}';

    const schema: EntitySchema = {
      metadata,
      name: metadata.name,

      query,
      mutation,
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
    db.mutations = {
      ...db.mutations,
      [`${db.name}_${CREATE}${name}`]: (obj, args, ctx, info) => ctx.provider.create(metadata, obj, args.record, ctx, info),
      [`${db.name}_${UPDATE}${name}`]: (obj, args, ctx, info) => ctx.provider.update(metadata, obj, args.record, ctx, info),
      [`${db.name}_${REMOVE}${name}`]: (obj, args, ctx, info) => ctx.provider.remove(metadata, obj, args, ctx, info),
    };
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
      } else {
        continue; // TODO: Implement
      }
    }
    for (const col of metadata.columns) {
      if (!col.isTransient) continue;
      const pn = col.propertyName;
      const nl = col.required ? '!' : '';
      model += `${cm ? '' : ','}\n  ${pn}: ${col.kind}${nl} @transient`;
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
    if (this.entities[struc.def]) return this.entities[struc.def];

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
        const sch = !GraphKind.isScalar(type.item.kind) && reg[type.item.def];
        const args = (sch && sch.params) ? `(\n${reg[type.item.def].params}\n  )` : '';
        schema.model += `  ${doc}${member.name}${args}: ${type.def}\n`;
      } else {
        schema.model += `  ${doc}${member.name}: ${type.def}\n`;
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
      api: metadata.alias,
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
      const call = GraphKind.isVoid(input.kind) ? `: ${result.def}` : `(${arg}: ${input.def}): ${result.def}`;
      const dir = ` @${method.auth}(api: "${method.api.alias}", method: "${method.name}", roles: ${scalar(method.roles)})`;
      const meth: MethodSchema = {
        metadata: method,
        api: metadata.alias,
        host: method.host && method.host.name,
        method: method.name,
        name,
        signature: call + dir,
        extension: undefined,
        resolver: (obj, args, ctx, info) => ctx.container.invoke(meth, obj, args[arg], ctx, info),
      };
      if (method.mutation) {
        api.mutations = api.mutations || {};
        api.mutations[method.name] = meth;
      } else if (method.query) {
        api.queries = api.queries || {};
        api.queries[method.name] = meth;
      } else if (method.resolver) {
        meth.extension = `extend type ${method.host.name} {\n  ${method.name}${call}${dir}\n}`;
        api.resolvers = api.resolvers || {};
        api.resolvers[method.name] = meth;
      }
    }
    this.apis[api.api] = api;
    return api;
  }
}
