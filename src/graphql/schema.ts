import { GraphQLSchema } from "graphql";
import { ILogger, makeExecutableSchema } from "graphql-tools";
import { ApiMetadata } from "../metadata/api";
import { ColumnType } from "../metadata/column";
import { DatabaseMetadata } from "../metadata/database";
import { EntityMetadata } from "../metadata/entity";
import { MethodMetadata } from "../metadata/method";
import { Registry } from "../metadata/registry";
import { RelationType } from "../metadata/relation";
import { EnumMetadata, GraphKind, TypeMetadata, VarMetadata } from "../metadata/type";
import "../schema/registry";
import { DEF_DIRECTIVES, DEF_SCALARS, DIRECTIVES } from "./base";
import { SchemaResolver } from "./types";

export { GraphQLSchema } from "graphql";

export const ENTITY = "";
export const GET = "";
export const SEARCH = "";
export const CREATE = "create";
export const UPDATE = "update";
export const REMOVE = "remove";


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

  query: string;
  mutation: string;
  model: string;
  inputs: string[];
  search: string;
  simple: string;
  script: string;
  select: string[];
  relations: Record<string, { target: string, type: string }>;

  resolvers: Record<string, SchemaResolver>;
}

export interface TypeSchema {
  metadata: TypeMetadata;
  model: string;
  script: string;
  select: string[];
  link: Record<string, string[]>;
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
  script: string;
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
  model: string;
}

export class CoreSchema {
  public enums: Record<string, EnumSchema> = {};
  public metadata: Record<string, TypeSchema> = {};
  public databases: Record<string, DatabaseSchema> = {};
  public inputs: Record<string, TypeSchema> = {};
  public results: Record<string, TypeSchema> = {};
  public entities: Record<string, EntitySchema> = {};
  public apis: Record<string, ApiSchema> = {};

  constructor() {
    Registry.validate();
    // Enums
    for (let type of Object.values(Registry.EnumMetadata))
      this.enums[type.name] = this.genEnum(type);
    // Metadata
    for (let type of Object.values(Registry.RegistryMetadata))
      this.genType(type, this.metadata);
    // Databases & Entities
    for (let type of Object.values(Registry.DatabaseMetadata))
      this.genDatabase(type);
    // Inputs
    for (let type of Object.values(Registry.InputMetadata))
      this.genType(type, this.inputs);
    // Results
    for (let type of Object.values(Registry.TypeMetadata))
      this.genType(type, this.results);
    // Api
    for (let api of Object.values(Registry.ApiMetadata)) {
      this.genApi(api);
    }
  }

  public executable(logger?: ILogger): GraphQLSchema {
    return makeExecutableSchema({
      typeDefs: this.typeDefs(),
      resolvers: this.resolvers(),
      schemaDirectives: DIRECTIVES,
      logger
    });
  }

  public typeDefs(): string {
    return back(`
            # -- Scalars --
            ${DEF_SCALARS}\n
            # -- Directives --
            ${DEF_DIRECTIVES}\n
            # -- Metadata Types --
            ${Object.values(this.metadata).map(m => m.model).join("\n")}\n
            # -- Metadata Resolvers --
            type Query {
              Metadata: MetadataRegistry
            }
            type Mutation {
              ping(input: ANY): ANY
            }

            # -- Enums --
            ${Object.values(this.enums).map(m => m.model).join("\n")}\n
        `) + Object.values(this.databases).map(db => {
        return `\n# -- Database: ${db.metadata.target.name} --\n`
          + `extend ${db.query}\n`
          + db.meta + "\n"
          + db.model + "\n"
          + Object.values(db.entities).map((e) => {
            return `\n# -- Entity: ${e.metadata.name} --\n`
              + `extend ${e.query}\n`
              + `extend ${e.mutation}\n`
              + `${e.model}\n${e.inputs.join("\n")}`;
          });
      }).join("\n")
      + "\n"
      + Object.values(this.inputs).map(i => `# -- Input: ${i.metadata.name} --\n${i.model}`).join("\n")
      + "\n"
      + Object.values(this.results).map(r => `# -- Type: ${r.metadata.name} --\n${r.model}`).join("\n")
      + "\n"
      + Object.values(this.apis).map(api => {
        let res = `\# -- API: ${api.metadata.alias} --#\n`;
        if (api.queries) {
          res += "extend type Query {\n  ";
          res += Object.values(api.queries).map(q => q.name + q.signature).join("\n  ");
          res += "\n}\n";
        }
        if (api.mutations) {
          res += "extend type Mutation {\n  ";
          res += Object.values(api.mutations).map(c => c.name + c.signature).join("\n  ");
          res += "\n}\n";
        }
        if (api.resolvers) {
          res += Object.values(api.resolvers).map(r => r.extension).join("\n") + "\n";
        }
        return res;
      }).join("\n");
  }

  public resolvers() {
    let resolvers: any = { Query: { Metadata: undefined }, Mutation: { ping: undefined }, MetadataRegistry: {} };
    resolvers.Query.Metadata = () => {
      return Registry.get();
    };
    resolvers.Mutation.ping = (obj: any, args: any) => {
      return { args, stamp: new Date().toISOString(), version: process.versions };
    };
    for (let schema of Object.values(this.databases)) {
      resolvers.Query = { ...resolvers.Query, [schema.name]: schema.root };
      resolvers.Mutation = { ...resolvers.Mutation, ...schema.mutations };
      resolvers[schema.name] = schema.queries;
      for (let [name, entity] of Object.entries(schema.entities))
        resolvers[name + ENTITY] = entity.resolvers;
    }
    for (let [target, schema] of Object.entries(this.metadata)) {
      resolvers[target] = schema.resolvers;
    }
    for (let api of Object.values(this.apis)) {
      if (api.queries) for (let method of Object.values(api.queries)) {
        resolvers.Query[method.name] = method.resolver;
      }
      if (api.mutations) for (let method of Object.values(api.mutations)) {
        resolvers.Mutation[method.name] = method.resolver;
      }
      if (api.resolvers) for (let method of Object.values(api.resolvers)) {
        resolvers[method.host] = resolvers[method.host] || {};
        resolvers[method.host][method.name] = method.resolver;
      }
    }
    return resolvers;
  }

  private genDatabase(metadata: DatabaseMetadata): DatabaseSchema {
    let meta: Record<string, EntityMetadata> = {};
    let typeName = metadata.target.name;
    let db: DatabaseSchema = {
      metadata,
      name: typeName,
      alias: metadata.alias,
      meta: `type ${typeName}Metadata {\n`,
      model: `type ${typeName} {\n  Metadata: ${typeName}Metadata\n}`,
      query: `type Query {\n  ${typeName}: ${typeName}\n}`,
      entities: {},
      root: () => ({}),
      queries: {
        Metadata: () => meta
      },
      mutations: {}
    };
    for (let entity of metadata.entities) {
      db.meta += `  ${entity.name}: EntityMetadata\n`;
      meta[entity.name] = entity;
      this.genEntity(db, entity);
    }
    db.meta += "}";
    return this.databases[db.name] = db;
  }

  private genEntity(db: DatabaseSchema, metadata: EntityMetadata): EntitySchema {
    let name = metadata.name;
    if (db.entities[name]) return db.entities[name];

    let model = `type ${name}${ENTITY} @entity {`;
    let script = `export interface ${name} {`;
    let input = `Input @expression {`;
    let nil = `Null @expression {`;
    let multi = `Multi @expression {`;
    let like = `Like @expression {`;
    let order = `Order @expression {`;
    let keys = "";
    let select: string[] = [];
    let create = `Create @record {`;
    let update = `Update @record {`;
    let cm = true;
    for (let col of metadata.columns) {
      let pn = col.propertyName;
      let dt = ColumnType.graphType(col.type);
      let jt = GraphKind.toJS(dt);
      let nl = !col.isNullable ? "!" : "";
      let op = !col.isNullable ? "?" : "";
      if (pn.endsWith("Id")) dt = GraphKind.ID;
      model += `${cm ? "" : ","}\n  ${pn}: ${dt}${nl}`;
      select.push(pn);
      script += `\n  ${pn}${op}: ${jt};`;
      if (col.isPrimary) keys += `${cm ? "" : ", "}${pn}: ${dt}${nl}`;
      input += `${cm ? "" : ","}\n  ${pn}: ${dt}`;
      nil += `${cm ? "" : ","}\n  ${pn}: Boolean`;
      multi += `${cm ? "" : ","}\n  ${pn}: [${dt}!]`;
      like += `${cm ? "" : ","}\n  ${pn}: String`;
      order += `${cm ? "" : ","}\n  ${pn}: Int`;
      update += `${cm ? "" : ","}\n    ${pn}: ${dt}${col.isPrimary ? "!" : ""}`;
      if (col.isCreateDate || col.isUpdateDate || col.isVersion || col.isVirtual || col.isGenerated) nl = "";
      create += `${cm ? "" : ","}\n    ${pn}: ${dt}${nl}`;
      cm = false;
    }
    // Debug field
    // model += `,\n  _exclude: Boolean`;
    // model += `,\n  _debug: _DebugInfo`;
    let opers = [
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
      + opers.join(",\n    ")
      + `,\n    order: ${name}Order,`
      + `\n    skip: Int,`
      + `\n    take: Int,`
      + `\n    exists: Boolean`;
    let where = `Where @expression {\n  `
      + opers.join(",\n  ");
    let find = "Query @expression {" + search;
    search += `,\n    query: ${name}Query`;

    let inputs = [create, update, input, find, where, nil, multi, like, order].map(x => `input ${name}${x}\n}`);

    let query = `type ${db.name} {\n`;
    query += `  ${GET}${name}(${keys}): ${name}${ENTITY} @crud(auth: {}),\n`;
    query += `  ${SEARCH}${name}s(${search}\n  ): [${name}${ENTITY}] @crud(auth: {})\n`;
    query += `}`;
    let mutation = "type Mutation {\n";
    mutation += `  ${db.name}_${CREATE}${name}(record: ${name}Create): ${name}${ENTITY} @crud(auth: {}),\n`;
    mutation += `  ${db.name}_${UPDATE}${name}(record: ${name}Update): ${name}${ENTITY} @crud(auth: {}),\n`;
    mutation += `  ${db.name}_${REMOVE}${name}(${keys}): ${name}${ENTITY} @crud(auth: {})\n`;
    mutation += "}";

    let schema: EntitySchema = {
      metadata,

      query,
      mutation,
      model,
      inputs,
      search,
      simple: model,
      script,
      select,
      relations: {},
      resolvers: {}
    };
    db.queries = {
      ...db.queries,
      [`${GET}${name}`]: (obj, args, ctx, info) => ctx.provider.get(metadata, obj, args, ctx, info),
      [`${SEARCH}${name}s`]: (obj, args, ctx, info) => ctx.provider.search(metadata, obj, args, ctx, info)
    };
    db.mutations = {
      ...db.mutations,
      [`${db.name}_${CREATE}${name}`]: (obj, args, ctx, info) => ctx.provider.create(metadata, obj, args.record, ctx, info),
      [`${db.name}_${UPDATE}${name}`]: (obj, args, ctx, info) => ctx.provider.update(metadata, obj, args.record, ctx, info),
      [`${db.name}_${REMOVE}${name}`]: (obj, args, ctx, info) => ctx.provider.remove(metadata, obj, args, ctx, info)
    };
    db.entities[name] = schema;
    this.entities[name] = schema;

    let simple = model;
    let navigation: Record<string, SchemaResolver> = {};
    for (let relation of metadata.relations) {
      let property = relation.propertyName;
      let inverse = relation.inverseEntityMetadata.name;
      let rm = schema.relations[property] = { inverse } as any;
      // TODO: Subset of entities
      // if (!entities.find(e => e.name === target)) continue;
      if (relation.relationType === RelationType.ManyToOne) {
        rm.type = "manyToOne";
        let args = "";
        model += `,\n  ${property}${args}: ${inverse}${ENTITY} @relation(type: ManyToOne)`;
        script += `\n  ${property}?: ${inverse};`;
        simple += `,\n  ${property}: ${inverse}${ENTITY}`;
        navigation[property] = (obj, args, ctx, info) => ctx.provider.manyToOne(metadata, relation, obj, args, ctx, info);
      } else if (relation.relationType === RelationType.OneToOne) {
        rm.type = "oneToOne";
        let args = "";
        model += `,\n  ${property}${args}: ${inverse}${ENTITY} @relation(type: OneToOne)`;
        script += `\n  ${property}?: ${inverse};`;
        navigation[property] = (obj, args, ctx, info) => ctx.provider.oneToOne(metadata, relation, obj, args, ctx, info);
      } else if (relation.relationType === RelationType.OneToMany) {
        rm.type = "oneToMany";
        let temp = this.genEntity(db, relation.inverseEntityMetadata);
        let args = ` (${temp.search}\n  )`;
        model += `,\n  ${property}${args}: [${inverse}${ENTITY}] @relation(type: OneToMany)`;
        script += `\n  ${property}?: ${inverse}[];`;
        navigation[property] = (obj, args, ctx, info) => ctx.provider.oneToMany(metadata, relation, obj, args, ctx, info);
      } else {
        continue; // TODO: Implement
      }
    }
    model += "\n}";
    script += "\n}";
    simple += "\n}";

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
    let i = 0;
    for (let key of metadata.options) {
      model += `${i++ ? "," : ""}\n  ${key}`;
    }
    model += "\n}";
    schema = { metadata, model };
    return schema;
  }

  private genType(metadata: VarMetadata, reg: Record<string, TypeSchema>): TypeSchema | EntitySchema {

    if (GraphKind.isScalar(metadata.kind)) return undefined;
    if (GraphKind.isEnum(metadata.kind)) return undefined;
    if (GraphKind.isRef(metadata.kind)) throw new TypeError("Unresolved reference");
    if (GraphKind.isArray(metadata.kind)) return this.genType(metadata.item, reg);

    let struc = metadata as TypeMetadata;
    if (reg[struc.name]) return reg[struc.name];
    if (this.entities[struc.def]) return this.entities[struc.def];

    if (!GraphKind.isStruc(struc.kind) || !struc.fields)
      throw new TypeError(`Empty type difinition ${struc.ref}`);

    // Generate schema
    let schema: TypeSchema = { metadata: struc, model: undefined, script: undefined, select: [], link: {}, params: undefined, resolvers: {} };
    reg[struc.name] = schema;
    schema.params = "";
    for (let field of Object.values(struc.fields)) {
      let type = field.type;
      if (GraphKind.isStruc(type.kind) || GraphKind.isArray(type.kind)) continue;
      schema.select.push(field.name);
      if (field.kind === GraphKind.Object) continue;
      schema.params += (schema.params ? ",\n    " : "    ") + `${field.name}: ${field.kind}`;
    }
    let scope = metadata.kind;
    schema.model = (scope === GraphKind.Input)
      ? `input ${struc.name} @${scope.toString().toLowerCase()} {\n`
      : `type ${struc.name} @${scope.toString().toLowerCase()} {\n`;
    schema.script = `export interface ${struc.name} {`;
    for (let field of Object.values(struc.fields)) {
      let type = field.type;
      if (GraphKind.isStruc(type.kind) || GraphKind.isArray(type.kind)) {
        let sch = this.genType(type, reg);
        schema.link[field.name] = sch && sch.select || null;
      }
      if (GraphKind.isMetadata(struc.kind) && GraphKind.isArray(type.kind)) {
        let sch = !GraphKind.isScalar(type.item.kind) && reg[type.item.def];
        let args = (sch && sch.params) ? `(\n${reg[type.item.def].params}\n  )` : "";
        schema.model += `  ${field.name}${args}: ${type.def}\n`;
      } else {
        schema.model += `  ${field.name}: ${type.def}\n`;
      }
      schema.script += `\n  ${field.name}?: ${type.js};`;
      let resolvers = (struc.ref as any).RESOLVERS;
      if (resolvers && resolvers[field.name]) schema.resolvers[field.name] = resolvers[field.name];
    }
    schema.model += "}";
    schema.script += "\n}";
    return schema;
  }

  private genApi(metadata: ApiMetadata): ApiSchema {
    let api: ApiSchema = {
      metadata,
      api: metadata.alias,
      queries: undefined,
      mutations: undefined,
      resolvers: undefined,
      script: undefined
    };
    let script = `\n@Injectable()\nexport class ${metadata.name} {\n`;
    script += `  constructor(private apollo: Apollo) { }\n`;
    for (let method of Object.values(metadata.methods)) {
      if (!method.query && !method.mutation && !method.resolver) continue;
      let input = method.input.type;
      let result = method.result.type;
      let name = method.resolver ? method.name : `${metadata.target.name}_${method.name}`;
      // TODO: Get it from typedef
      const arg = (method.resolver ? method.design[1].name : method.design[0].name) || "input";
      let call = GraphKind.isVoid(input.kind) ? `: ${result.def}` : `(${arg}: ${input.def}): ${result.def}`;
      let art = (GraphKind.isVoid(input.kind) ? "()" : `(${arg}: ${input.js})`);
      let art2 = (GraphKind.isVoid(input.kind) ? "" : `($${arg}: ${input.def})`);
      let art3 = (GraphKind.isVoid(input.kind) ? "" : `(${arg}: $${arg})`);
      let action = method.mutation ? "mutate" : "query";
      script += `  public ${method.name}${art}: Observable<${result.js}> {\n`;
      script += `    return this.apollo.${action}<any>({\n`;
      if (method.mutation)
        script += `      mutation: gql\`mutation request${art2}`;
      else
        script += `      query: gql\`query request${art2}`;
      if (GraphKind.isStruc(result.kind)) {
        script += ` {\n`;
        let struc = result as TypeMetadata;
        let res = this.results[struc.name];
        let ent = this.entities[struc.def];
        let select = res && res.select.join(",\n          ")
          || ent && ent.select.join(",\n          ");
        if (method.query)
          script += `        result: ${method.api.name}_${method.name}${art3} {\n`;
        else
          script += `        result: ${method.api.name}_${method.name}${art3} {\n`;
        script += `          ${select || "# NONE"}`;
        if (res && Object.keys(res.link).length) {
          for (let link of Object.entries(res.link)) {
            script += `,\n          ${link[0]}`;
            if (link[1]) {
              script += ` {\n`;
              script += `            ${link[1] && link[1].join(", ")}\n`;
              script += `          }`;
            } else {
              script += ` # [ANY]\n`;
            }
          }
        }
        script += "\n";
        script += `        }\n`;
        script += `      }\`,\n`;
      } else {
        script += `\`, // : ANY\n`;
      }
      if (art3) script += `      variables: { ${arg} }\n`;
      script += `    }).pipe(map(res => res.data.result));\n`;
      script += `  }\n`;

      let dir = ` @${method.auth}(api: "${method.api.alias}", method: "${method.name}", roles: ${scalar(method.roles)})`;
      let meth: MethodSchema = {
        metadata: method,
        api: metadata.alias,
        host: method.host && method.host.name,
        method: method.name,
        name,
        signature: call + dir,
        extension: undefined,
        resolver: (obj, args, ctx, info) => ctx.container.invoke(meth, obj, args[arg], ctx, info)
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
    script += "}";
    api.script = script;
    this.apis[api.api] = api;
    return api;
  }
}

function scalar(obj: any): string {
  let res = "{";
  let i = 0;
  for (let [key, val] of Object.entries(obj)) res += `${(i++) ? ", " : " "}${key}: ${JSON.stringify(val)}`;
  res += " }";
  return res;
}

function back(text: string) {
  let lines = text.split("\n");
  let first = lines[0];
  if (!first.trim().length) first = lines[1];
  let pad = first.substr(0, first.indexOf(first.trim()));
  text = lines.map(line => line.startsWith(pad) ? line.substring(pad.length) : line)
    .map(line => line.trimRight())
    .join("\n");
  return text;
}

// function ww(path) {
//     return (path.prev ? ww(path.prev) : "") + "/" + path.key;
// }

