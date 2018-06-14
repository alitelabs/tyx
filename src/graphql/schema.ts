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
    target: DatabaseMetadata;
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
    target: EntityMetadata;

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
    target: TypeMetadata;
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
    target: ApiMetadata;
    api: string;
    queries: Record<string, MethodSchema>;
    mutations: Record<string, MethodSchema>;
    resolvers: Record<string, MethodSchema>;
    script: string;
}

export interface MethodSchema {
    target: MethodMetadata;
    api: string;
    host: string;
    method: string;
    name: string;
    signature: string;
    extension: string;
    resolver: SchemaResolver;
}

export interface EnumSchema {
    target: EnumMetadata;
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
        // Enums
        for (let type of Object.values(Registry.EnumMetadata))
            this.enums[type.name] = this.genEnum(type);
        // Metadata
        for (let type of Object.values(Registry.RegistryMetadata))
            this.genType(type, GraphKind.Metadata, this.metadata);
        // Databases & Entities
        for (let type of Object.values(Registry.DatabaseMetadata))
            this.genDatabase(type);
        // Inputs
        for (let type of Object.values(Registry.InputMetadata))
            this.genType(type, GraphKind.Input, this.inputs);
        // Results
        for (let type of Object.values(Registry.TypeMetadata))
            this.genType(type, GraphKind.Type, this.results);
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
                return `\n# -- Database: ${db.target.target.name} --\n`
                    + `extend ${db.query}\n`
                    + db.meta + "\n"
                    + db.model + "\n"
                    + Object.values(db.entities).map((e) => {
                        return `\n# -- Entity: ${e.target.name} --\n`
                            + `extend ${e.query}\n`
                            + `extend ${e.mutation}\n`
                            + `${e.model}\n${e.inputs.join("\n")}`;
                    });
            }).join("\n")
            + "\n"
            + Object.values(this.inputs).map(i => `# -- Input: ${i.target.name} --\n${i.model}`).join("\n")
            + "\n"
            + Object.values(this.results).map(r => `# -- Type: ${r.target.name} --\n${r.model}`).join("\n")
            + "\n"
            + Object.values(this.apis).map(api => {
                let res = `\# -- API: ${api.target.alias} --#\n`;
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

    private genDatabase(target: DatabaseMetadata): DatabaseSchema {
        let meta: Record<string, EntityMetadata> = {};
        let typeName = target.target.name;
        let db: DatabaseSchema = {
            target,
            name: typeName,
            alias: target.alias,
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
        for (let entity of target.entities) {
            db.meta += `  ${entity.name}: EntityMetadata\n`;
            meta[entity.name] = entity;
            this.genEntity(db, entity);
        }
        db.meta += "}";
        return this.databases[db.name] = db;
    }

    private genEntity(db: DatabaseSchema, target: EntityMetadata): EntitySchema {
        let name = target.name;
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
        for (let col of target.columns) {
            let pn = col.propertyName;
            let dt = ColumnType.graphType(col.type);
            let jt = GraphKind.toJS(dt);
            let nl = !col.isNullable ? "!" : "";
            let op = !col.isNullable ? "?" : "";
            if (pn.endsWith("Id")) dt = GraphKind.ID;
            model += `${cm ? "" : ","}\n  ${pn}: ${dt}${nl}`;
            select.push(pn);
            script += `\n    ${pn}${op}: ${jt};`;
            if (col.isPrimary)
                keys += `${cm ? "" : ", "}${pn}: ${dt}${nl}`;
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
            target,

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
            [`${GET}${name}`]: (obj, args, ctx, info) => ctx.provider.get(target, obj, args, ctx, info),
            [`${SEARCH}${name}s`]: (obj, args, ctx, info) => ctx.provider.search(target, obj, args, ctx, info)
        };
        db.mutations = {
            ...db.mutations,
            [`${db.name}_${CREATE}${name}`]: (obj, args, ctx, info) => ctx.provider.create(target, obj, args.record, ctx, info),
            [`${db.name}_${UPDATE}${name}`]: (obj, args, ctx, info) => ctx.provider.update(target, obj, args.record, ctx, info),
            [`${db.name}_${REMOVE}${name}`]: (obj, args, ctx, info) => ctx.provider.remove(target, obj, args, ctx, info)
        };
        db.entities[name] = schema;
        this.entities[name] = schema;

        let simple = model;
        let navigation: Record<string, SchemaResolver> = {};
        for (let relation of target.relations) {
            let property = relation.propertyName;
            let inverse = relation.inverseEntityMetadata.name;
            let rm = schema.relations[property] = { inverse } as any;
            // TODO: Subset of entities
            // if (!entities.find(e => e.name === target)) continue;
            if (relation.relationType === RelationType.ManyToOne) {
                rm.type = "manyToOne";
                let args = "";
                model += `,\n  ${property}${args}: ${inverse}${ENTITY} @relation(type: ManyToOne)`;
                script += `\n    ${property}?: ${inverse};`;
                simple += `,\n  ${property}: ${inverse}${ENTITY}`;
                navigation[property] = (obj, args, ctx, info) => ctx.provider.manyToOne(target, relation, obj, args, ctx, info);
            } else if (relation.relationType === RelationType.OneToOne) {
                rm.type = "oneToOne";
                let args = "";
                model += `,\n  ${property}${args}: ${inverse}${ENTITY} @relation(type: OneToOne)`;
                script += `\n    ${property}?: ${inverse};`;
                navigation[property] = (obj, args, ctx, info) => ctx.provider.oneToOne(target, relation, obj, args, ctx, info);
            } else if (relation.relationType === RelationType.OneToMany) {
                rm.type = "oneToMany";
                let temp = this.genEntity(db, relation.inverseEntityMetadata);
                let args = ` (${temp.search}\n  )`;
                model += `,\n  ${property}${args}: [${inverse}${ENTITY}] @relation(type: OneToMany)`;
                script += `\n    ${property}?: ${inverse}[];`;
                navigation[property] = (obj, args, ctx, info) => ctx.provider.oneToMany(target, relation, obj, args, ctx, info);
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

    private genEnum(target: EnumMetadata): EnumSchema {
        let schema = this.enums[target.name];
        if (schema) return schema;
        let model = `enum ${target.name} {`;
        let obj = target.ref();
        let i = 0;
        for (let key in obj) {
            model += `${i++ ? "," : ""}\n  ${key}`;
        }
        model += "\n}";
        schema = { target, model };
        return schema;
    }

    private genType(target: VarMetadata, scope: GraphKind, reg: Record<string, TypeSchema>): VarMetadata {
        if (GraphKind.isScalar(target.kind)) {
            target.def = target.def || target.kind;
            target.js = GraphKind.toJS(target.kind);
            return target;
        }
        if (GraphKind.isEnum(target.kind)) {
            let meta = this.genEnum(target as EnumMetadata);
            return { kind: GraphKind.Enum, ref: meta.target.ref, def: meta.target.name };
        }
        if (GraphKind.isRef(target.kind)) {
            let ref = target.ref();
            if (GraphKind.isEnum(ref.kind)) {
                return this.genType(ref, scope, reg);
            }
            let kind = VarMetadata.of(ref);
            if (GraphKind.isScalar(kind.kind)) return { kind: kind.kind, def: kind.kind, js: GraphKind.toJS(kind.kind) };
            if (GraphKind.isArray(kind.kind)) {
                const z = kind.item.ref;
                kind.item.ref = () => z;
                return this.genType(kind, scope, reg);
            }
            if (GraphKind.isRef(kind.kind)) {
                let entity = EntityMetadata.get(kind.ref);
                if (entity) {
                    if (GraphKind.isInput(scope)) throw new TypeError(`Input type can not reference entity [${entity.name}]`);
                    // TODO: Makesure entity exists
                    return { kind: GraphKind.Entity, def: entity.name, name: entity.name, js: entity.name } as TypeMetadata;
                }
                let meta = TypeMetadata.get(kind.ref);
                if (meta) {
                    return this.genType(meta, scope, reg);
                } else {
                    return { kind: GraphKind.Object, def: GraphKind.Object, js: "any", name: "any" } as any;
                }
            }
        } else if (GraphKind.isArray(target.kind)) {
            let type = this.genType(target.item, scope, reg) as any;
            if (type) {
                return { kind: GraphKind.Array, def: `[${type.def}]`, item: type, js: `${type.js}[]`, name: type.def, select: type.select } as any;
            } else {
                return { kind: GraphKind.Array, def: `[${GraphKind.Object}]`, js: "any[]", name: "any", select: null } as any;
            }
        }
        if (GraphKind.isStruc(target.kind)) {
            let struc = target as TypeMetadata;
            let link = struc.ref && struc.name || target.ref.name;
            if (link && reg[link]) return reg[link].target;
        }
        // if (GraphType.isEntity(target.type) && scope === GraphType.Result) {
        //     // TODO: Register imports
        //     return target.target.name;
        // }

        if (scope === GraphKind.Metadata && !GraphKind.isMetadata(target.kind))
            throw new TypeError(`Metadata type can not reference [${target.kind}]`);

        if (scope === GraphKind.Input && !GraphKind.isInput(target.kind))
            throw new TypeError(`Input type can not reference [${target.kind}]`);

        if (scope === GraphKind.Type && !GraphKind.isType(target.kind) && !GraphKind.isEntity(target.kind))
            throw new TypeError(`Type type can not reference [${target.kind}]`);

        let struc = target as TypeMetadata;
        if (!GraphKind.isStruc(struc.kind) || !struc.fields)
            throw new TypeError(`Empty type difinition ${struc.ref}`);

        // Generate schema
        struc.def = struc.name;
        struc.js = struc.name;
        let schema: TypeSchema = { target: struc, model: undefined, script: undefined, select: [], link: {}, params: undefined, resolvers: {} };
        reg[struc.name] = schema;
        schema.params = "";
        for (let field of Object.values(struc.fields)) {
            if (!GraphKind.isScalar(field.kind as GraphKind)) continue;
            schema.params += (schema.params ? ",\n    " : "    ") + `${field.name}: ${field.kind}`;
            schema.select.push(field.name);
        }
        schema.model = (scope === GraphKind.Input)
            ? `input ${struc.name} @${scope.toString().toLowerCase()} {\n`
            : `type ${struc.name} @${scope.toString().toLowerCase()} {\n`;
        schema.script = `export interface ${struc.name} {`;
        for (let field of Object.values(struc.fields)) {
            let type = this.genType(field, scope, reg);
            if (GraphKind.isStruc(type.kind)) {
                let sch = type as TypeMetadata;
                schema.link[field.name] =
                    reg[sch.name] && reg[sch.name].select
                    || this.entities[sch.name] && this.entities[sch.name].select;
            }
            if (GraphKind.isArray(type.kind)) {
                let sch = type as TypeMetadata;
                schema.link[field.name] =
                    reg[sch.name] && reg[sch.name].select
                    || this.entities[sch.name] && this.entities[sch.name].select;
            }
            if (GraphKind.isMetadata(struc.kind) && GraphKind.isArray(type.kind)) {
                let sch = !GraphKind.isScalar(type.item.kind) && reg[type.item.def];
                let args = (sch && sch.params) ? `(\n${reg[type.item.def].params}\n  )` : "";
                schema.model += `  ${field.name}${args}: ${type.def}\n`;
            } else {
                schema.model += `  ${field.name}: ${type.def}\n`;
            }
            schema.script += `\n    ${field.name}?: ${type.js};`;
            let resolvers = (struc.ref as any).RESOLVERS;
            if (resolvers && resolvers[field.name]) schema.resolvers[field.name] = resolvers[field.name];
        }
        schema.model += "}";
        schema.script += "\n}";

        return struc;
    }

    private genApi(target: ApiMetadata): ApiSchema {
        let api: ApiSchema = {
            target,
            api: target.alias,
            queries: undefined,
            mutations: undefined,
            resolvers: undefined,
            script: undefined
        };
        let script = `\n@Injectable()\nexport class ${target.name} {\n`;
        script += `    constructor(private apollo: Apollo) { }\n`;
        for (let method of Object.values(target.methods)) {
            if (!method.query && !method.mutation && !method.resolver) continue;
            let input = this.genType(method.input, GraphKind.Input, this.inputs);
            let result = this.genType(method.result, GraphKind.Type, this.results);
            let name = method.resolver ? method.name : `${target.target.name}_${method.name}`;
            // TODO: Get it from typedef
            const arg = (method.resolver ? method.design[1].name : method.design[0].name) || "input";
            let call = GraphKind.isVoid(input.kind) ? `: ${result.def}` : `(${arg}: ${input.def}): ${result.def}`;
            let art = (GraphKind.isVoid(input.kind) ? "()" : `(${arg}: ${input.js})`);
            let art2 = (GraphKind.isVoid(input.kind) ? "" : `($${arg}: ${input.def})`);
            let art3 = (GraphKind.isVoid(input.kind) ? "" : `(${arg}: $${arg})`);
            let action = method.mutation ? "mutate" : "query";
            script += `    public ${method.name}${art}: Observable<${result.js}> {\n`;
            script += `        return this.apollo.${action}<any>({\n`;
            if (method.mutation)
                script += `            mutation: gql\`mutation request${art2}`;
            else
                script += `            query: gql\`query request${art2}`;
            if (GraphKind.isStruc(result.kind)) {
                script += ` {\n`;
                let struc = result as TypeMetadata;
                let res = this.results[struc.name];
                let ent = this.entities[struc.name];
                let select = res && res.select.join(",\n                    ")
                    || ent && ent.select.join(",\n                    ");
                if (method.query)
                    script += `                result: ${method.api.name}_${method.name}${art3} {\n`;
                else
                    script += `                result: ${method.api.name}_${method.name}${art3} {\n`;
                script += `                    ${select || "# NONE"}`;
                if (res && Object.keys(res.link).length) {
                    for (let link of Object.entries(res.link)) {
                        script += `,\n                    ${link[0]}`;
                        if (link[1]) {
                            script += ` {\n`;
                            script += `                        ${link[1] && link[1].join(", ")}\n`;
                            script += `                    }`;
                        } else {
                            script += ` # [ANY]\n`;
                        }
                    }
                }
                script += "\n";
                script += `                }\n`;
                script += `            }\`,\n`;
            } else {
                script += `\`, // : ANY\n`;
            }
            if (art3) script += `            variables: { ${arg} }\n`;
            script += `        }).pipe(map(res => res.data.result));\n`;
            script += `    }\n`;

            let dir = ` @${method.auth}(api: "${method.api.alias}", method: "${method.name}", roles: ${scalar(method.roles)})`;
            let meth: MethodSchema = {
                target: method,
                api: target.alias,
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

