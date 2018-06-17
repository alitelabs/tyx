import { GraphQLSchema } from 'graphql';
import { ILogger, makeExecutableSchema } from 'graphql-tools';
import { ApiMetadata } from '../metadata/api';
import { ColumnType } from '../metadata/column';
import { DatabaseMetadata } from '../metadata/database';
import { EntityMetadata } from '../metadata/entity';
import { MethodMetadata } from '../metadata/method';
import { Registry } from '../metadata/registry';
import { RelationType } from '../metadata/relation';
import { EnumMetadata, GraphKind, Select, TypeMetadata, VarMetadata } from '../metadata/type';
import '../schema/registry';
import { DEF_DIRECTIVES, DEF_SCALARS, DIRECTIVES } from './base';
import { SchemaResolver } from './types';

export { GraphQLSchema } from 'graphql';

export const ENTITY = '';
export const GET = '';
export const SEARCH = '';
export const CREATE = 'create';
export const UPDATE = 'update';
export const REMOVE = 'remove';

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
  script: string;
  relations: Record<string, { target: string, type: string }>;

  resolvers: Record<string, SchemaResolver>;
}

export interface TypeSchema {
  metadata: TypeMetadata;
  name: string;

  model: string;
  script: string;
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
    Registry.validate();
    // Enums
    for (const type of Object.values(Registry.EnumMetadata)) {
      this.enums[type.name] = this.genEnum(type);
    }
    // Metadata
    for (const type of Object.values(Registry.RegistryMetadata)) {
      this.genType(type, this.metadata);
    }
    // Databases & Entities
    for (const type of Object.values(Registry.DatabaseMetadata)) {
      this.genDatabase(type);
    }
    // Inputs
    for (const type of Object.values(Registry.InputMetadata)) {
      this.genType(type, this.inputs);
    }
    // Results
    for (const type of Object.values(Registry.TypeMetadata)) {
      this.genType(type, this.types);
    }
    // Api
    for (const api of Object.values(Registry.ApiMetadata)) {
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

  public typeDefs(): string {
    return back(`
            # -- Scalars --
            ${DEF_SCALARS}\n
            # -- Directives --
            ${DEF_DIRECTIVES}\n
            # -- Metadata Types --
            ${Object.values(this.metadata).map(m => m.model).join('\n')}\n
            # -- Metadata Resolvers --
            type Query {
              Metadata: MetadataRegistry
            }
            type Mutation {
              ping(input: ANY): ANY
            }

            # -- Enums --
            ${Object.values(this.enums).map(m => m.model).join('\n')}\n
        `)
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
      + '\n'
      + Object.values(this.apis).map((api) => {
        let res = `\# -- API: ${api.metadata.alias} --#\n`;
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
        return res;
      }).join('\n');
  }

  public resolvers() {
    const resolvers: any = { Query: { Metadata: undefined }, Mutation: { ping: undefined }, MetadataRegistry: {} };
    resolvers.Query.Metadata = () => {
      return Registry.get();
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
    let script = `export interface ${name} {`;
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
      const pn = col.propertyName;
      let dt = ColumnType.graphType(col.type);
      const jt = GraphKind.toJS(dt);
      let nl = !col.isNullable ? '!' : '';
      const op = !col.isNullable ? '?' : '';
      if (pn.endsWith('Id')) dt = GraphKind.ID;
      model += `${cm ? '' : ','}\n  ${pn}: ${dt}${nl}`;
      script += `\n  ${pn}${op}: ${jt};`;
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
      script,
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
        script += `\n  ${property}?: ${inverse};`;
        simple += `,\n  ${property}: ${inverse}${ENTITY}`;
        navigation[property] = (obj, args, ctx, info) => ctx.provider.manyToOne(metadata, relation, obj, args, ctx, info);
      } else if (relation.relationType === RelationType.OneToOne) {
        rm.type = 'oneToOne';
        const args = '';
        model += `,\n  ${property}${args}: ${inverse}${ENTITY} @relation(type: OneToOne)`;
        script += `\n  ${property}?: ${inverse};`;
        navigation[property] = (obj, args, ctx, info) => ctx.provider.oneToOne(metadata, relation, obj, args, ctx, info);
      } else if (relation.relationType === RelationType.OneToMany) {
        rm.type = 'oneToMany';
        const temp = this.genEntity(db, relation.inverseEntityMetadata);
        const args = ` (${temp.search}\n  )`;
        model += `,\n  ${property}${args}: [${inverse}${ENTITY}] @relation(type: OneToMany)`;
        script += `\n  ${property}?: ${inverse}[];`;
        navigation[property] = (obj, args, ctx, info) => ctx.provider.oneToMany(metadata, relation, obj, args, ctx, info);
      } else {
        continue; // TODO: Implement
      }
    }
    model += '\n}';
    script += '\n}';
    simple += '\n}';

    schema.model = model;
    schema.script = script;
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
      script: undefined,
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
    schema.script = `export interface ${struc.name} {`;
    for (const field of Object.values(struc.members)) {
      const type = field.build;
      if (GraphKind.isMetadata(struc.kind) && GraphKind.isArray(type.kind)) {
        const sch = !GraphKind.isScalar(type.item.kind) && reg[type.item.def];
        const args = (sch && sch.params) ? `(\n${reg[type.item.def].params}\n  )` : '';
        schema.model += `  ${field.name}${args}: ${type.def}\n`;
      } else {
        schema.model += `  ${field.name}: ${type.def}\n`;
      }
      schema.script += `\n  ${field.name}?: ${type.js};`;
      const resolvers = (struc.target as any).RESOLVERS;
      if (resolvers && resolvers[field.name]) schema.resolvers[field.name] = resolvers[field.name];
    }
    schema.model += '}';
    schema.script += '\n}';
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

  public backend(): string {
    let script = back(`
    import { Injectable } from '@angular/core';
    import { Apollo } from 'apollo-angular';
    import gql from 'graphql-tag';
    import { Observable } from 'rxjs';
    import { map } from 'rxjs/operators';
    \n`).trimLeft();
    script += '///////// API /////////\n';
    for (const api of Object.values(this.apis).sort((a, b) => a.api.localeCompare(b.api))) {
      const code = this.genAngular(api.metadata);
      if (code) script += code + '\n\n';
    }
    script += '///////// ENUM ////////\n';
    for (const type of Object.values(this.enums).sort((a, b) => a.name.localeCompare(b.name))) {
      script += type.script + '\n\n';
    }
    script += '/////// ENTITIES //////\n';
    const db = Object.values(this.databases)[0];
    for (const type of Object.values(db.entities).sort((a, b) => a.name.localeCompare(b.name))) {
      script += type.script + '\n\n';
    }
    script += '//////// INPUTS ///////\n';
    for (const type of Object.values(this.inputs).sort((a, b) => a.name.localeCompare(b.name))) {
      script += type.script + '\n\n';
    }
    script += '//////// TYPES ////////\n';
    for (const type of Object.values(this.types).sort((a, b) => a.name.localeCompare(b.name))) {
      script += type.script + '\n\n';
    }
    return script;
  }

  private genAngular(metadata: ApiMetadata): string {
    let script = `@Injectable()\nexport class ${metadata.name} {\n`;
    script += `  constructor(private graphql: Apollo) { }\n`;
    let count = 0;
    for (const method of Object.values(metadata.methods)) {
      if (!method.query && !method.mutation && !method.resolver) continue;
      count++;
      const input = method.input.build;
      const result = method.result.build;
      const arg = (method.resolver ? method.design[1].name : method.design[0].name) || 'input';
      const art = (GraphKind.isVoid(input.kind) ? '()' : `(${arg}: ${input.js})`);
      const art2 = (GraphKind.isVoid(input.kind) ? '' : `($${arg}: ${input.def})`);
      const art3 = (GraphKind.isVoid(input.kind) ? '' : `(${arg}: $${arg})`);
      const action = method.mutation ? 'mutate' : 'query';
      script += `\n  public ${method.name}${art}: Observable<${result.js}> {\n`;
      script += `    return this.graphql.${action}<${result.js}>({\n`;
      if (method.mutation) {
        script += `      mutation: gql\`mutation request${art2} {\n`;
      } else {
        script += `      query: gql\`query request${art2} {\n`;
      }
      script += `        result: ${method.api.name}_${method.name}${art3}`;
      if (GraphKind.isStruc(result.kind)) {
        const x = (GraphKind.isType(result.kind)) ? 0 : 0;
        const select = this.genSelect(result, method.select, 0, 1 + x);
        script += ' ' + select;
      } else if (GraphKind.isArray(result.kind)) {
        const x = (GraphKind.isType(result.item.kind)) ? 0 : 0;
        const select = this.genSelect(result.item, method.select, 0, 1 + x);
        script += ' ' + select;
      } else {
        script += ` # : ANY`;
      }
      script += `\n      }\`,\n`;
      if (art3) script += `      variables: { ${arg} }\n`;
      script += `    }).pipe(map(res => res.data.result));\n`;
      script += `  }\n`;
    }
    script += '}';
    return count ? script : '';
  }

  private genSelect(meta: VarMetadata, select: Select | any, level: number, depth: number): string {
    if (level >= depth) return null;
    if (GraphKind.isScalar(meta.kind)) return `# ${meta.js}`;
    if (GraphKind.isRef(meta.kind)) return this.genSelect(meta.build, select, level, depth);
    if (GraphKind.isArray(meta.kind)) return this.genSelect(meta.item, select, level, depth);
    // script += ` # [ANY]\n`;
    // #  NONE
    const type = meta as TypeMetadata;
    const tab = '  '.repeat(level + 4);
    let script = `{`;
    let i = 0;
    for (const member of Object.values(type.members)) {
      let name = member.name;
      let def = `# ${member.build.js}`;
      if (!GraphKind.isScalar(member.kind)) {
        def += ' ...';
        if (select instanceof Object && select[member.name]) {
          const sub = this.genSelect(member.build, select && select[member.name], level + 1, depth + 1);
          def = sub || def;
          if (!sub) name = '# ' + name;
        } else {
          name = '# ' + name;
        }
      }
      script += `${i++ ? ',' : ''}\n${tab}  ${name} ${def}`;
    }
    script += `\n${tab}}`;
    return script;
  }
}

function scalar(obj: any): string {
  let res = '{';
  let i = 0;
  for (const [key, val] of Object.entries(obj)) res += `${(i++) ? ', ' : ' '}${key}: ${JSON.stringify(val)}`;
  res += ' }';
  return res;
}

function back(text: string) {
  const lines = text.split('\n');
  let first = lines[0];
  if (!first.trim().length) first = lines[1];
  const pad = first.substr(0, first.indexOf(first.trim()));
  const res = lines.map(line => line.startsWith(pad) ? line.substring(pad.length) : line)
    .map(line => line.trimRight())
    .join('\n');
  return res;
}

// function ww(path) {
//     return (path.prev ? ww(path.prev) : "") + "/" + path.key;
// }
