import { GraphQLSchema } from "graphql";
import { ILogger, makeExecutableSchema } from "graphql-tools";
import { ApiMetadata } from "../metadata/api";
import { ColumnType } from "../metadata/column";
import { EntityMetadata } from "../metadata/entity";
import { MethodMetadata } from "../metadata/method";
import { Registry } from "../metadata/registry";
import { RelationType } from "../metadata/relation";
import { GraphMetadata, GraphType, TypeMetadata } from "../metadata/type";
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


export interface EntitySchema {
    target: EntityMetadata;

    query: string;
    mutation: string;
    model: string;
    inputs: string[];
    search: string;
    simple: string;
    relations: Record<string, { target: string, type: string }>;

    queries: Record<string, SchemaResolver>;
    mutations: Record<string, SchemaResolver>;
    navigation: Record<string, SchemaResolver>;
}

export interface TypeSchema {
    target: TypeMetadata;
    model: string;
    // query: string;
    params: string;
    // registry: SchemaResolver;
    resolvers: Record<string, SchemaResolver>;
}

export interface ApiSchema {
    target: ApiMetadata;
    api: string;
    queries: Record<string, MethodSchema>;
    commands: Record<string, MethodSchema>;
}

export interface MethodSchema {
    target: MethodMetadata;
    api: string;
    method: string;
    name: string;
    signature: string;
    resolver: SchemaResolver;
}

export class CoreSchema {
    public metadata: Record<string, TypeSchema> = {};
    public entities: Record<string, EntitySchema> = {};
    public inputs: Record<string, TypeSchema> = {};
    public results: Record<string, TypeSchema> = {};
    public apis: Record<string, ApiSchema> = {};

    constructor() {
        // Metadata
        for (let type of Object.values(Registry.RegistryMetadata))
            this.genType(type, GraphType.Metadata, this.metadata);
        // Entities
        for (let meta of Object.values(Registry.EntityMetadata))
            this.genEntity(meta, this.entities);
        // Inputs
        for (let type of Object.values(Registry.InputMetadata))
            this.genType(type, GraphType.Input, this.inputs);
        // Results
        for (let type of Object.values(Registry.ResultMetadata))
            this.genType(type, GraphType.Result, this.results);
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
            #### Scalars ####
            ${DEF_SCALARS}\n
            #### Directives ####
            ${DEF_DIRECTIVES}\n
            #### Metadata Types ####
            ${Object.values(this.metadata).map(m => m.model).join("\n")}\n
            #### Metadata Resolvers ####
            type Query {
              Metadata: MetadataRegistry
            }
            type Mutation {
              reloadMetadata(role: String): JSON
            }
        \n`) + Object.values(this.entities).map((e) => {
                return `\n#### Entity: ${e.target.name} ####\n`
                    + `extend ${e.query}\n`
                    + `extend ${e.mutation}\n`
                    + `${e.model}\n${e.inputs.join("\n")}`;
            })
            + "\n"
            + Object.values(this.inputs).map(i => `#### Input: ${i.target.name} ####\n${i.model}`).join("\n")
            + "\n"
            + Object.values(this.results).map(r => `#### Result: ${r.target.name} ####\n${r.model}`).join("\n")
            + "\n"
            + Object.values(this.apis).map(api => {
                let res = `\#### API: ${api.target.alias} #####\n`;
                if (api.queries) {
                    res += "extend type Query {\n  ";
                    res += Object.values(api.queries).map(q => q.name + q.signature).join("\n  ");
                    res += "\n}\n";
                }
                if (api.commands) {
                    res += "extend type Mutation {\n  ";
                    res += Object.values(api.commands).map(c => c.name + c.signature).join("\n  ");
                    res += "\n}\n";
                }
                return res;
            }).join("\n");
    }

    public resolvers() {
        let resolvers = { Query: { Metadata: undefined }, Mutation: {}, MetadataRegistry: {} };
        resolvers.Query.Metadata = () => {
            return Registry.get();
        };
        for (let [target, schema] of Object.entries(this.entities)) {
            resolvers.Query = { ...resolvers.Query, ...schema.queries };
            resolvers.Mutation = { ...resolvers.Mutation, ...schema.mutations };
            resolvers[target + ENTITY] = schema.navigation;
        }
        for (let [target, schema] of Object.entries(this.metadata)) {
            resolvers[target] = schema.resolvers;
        }
        for (let api of Object.values(this.apis)) {
            if (api.queries) for (let method of Object.values(api.queries)) {
                if (method.target.query && method.resolver) resolvers.Query[method.name] = method.resolver;
            }
            if (api.commands) for (let method of Object.values(api.commands)) {
                if (method.target.mutation && method.resolver) resolvers.Mutation[method.name] = method.resolver;
            }
        }
        return resolvers;
    }

    private genEntity(target: EntityMetadata, schemas: Record<string, EntitySchema>): EntitySchema {
        let name = target.name;
        if (schemas[name]) return schemas[name];

        let model = `type ${name}${ENTITY} @entity {`;
        let input = `Input @expression {`;
        let nil = `Null @expression {`;
        let multi = `Multi @expression {`;
        let like = `Like @expression {`;
        let order = `Order @expression {`;
        let keys = "";
        let create = ``;
        let update = ``;
        let cm = true;
        for (let col of target.columns) {
            let pn = col.propertyName;
            let dt = ColumnType.graphType(col.type);
            let nl = !col.isNullable ? "!" : "";
            if (pn.endsWith("Id")) dt = GraphType.ID;
            model += `${cm ? "" : ","}\n  ${pn}: ${dt}${nl}`;
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
        let inputs = [input, where, nil, multi, like, order].map(x => `input ${name}${x}\n}`);

        let query = `type Query {\n`;
        query += `  ${GET}${name}(${keys}): ${name}${ENTITY} @crud(auth: {}),\n`;
        query += `  ${SEARCH}${name}s(${search}\n  ): [${name}${ENTITY}] @crud(auth: {})\n`;
        query += `}`;
        let mutation = "type Mutation {\n";
        mutation += `  ${CREATE}${name}(${create}\n  ): ${name}${ENTITY} @crud(auth: {}),\n`;
        mutation += `  ${UPDATE}${name}(${update}\n  ): ${name}${ENTITY} @crud(auth: {}),\n`;
        mutation += `  ${REMOVE}${name}(${keys}): ${name}${ENTITY} @crud(auth: {})\n`;
        mutation += "}";

        let schema: EntitySchema = {
            target,

            query,
            mutation,
            model,
            inputs,
            search,
            simple: model,
            relations: {},
            queries: {
                [`${GET}${name}`]: (obj, args, ctx, info) => ctx.provider.get(target, obj, args, ctx, info),
                [`${SEARCH}${name}s`]: (obj, args, ctx, info) => ctx.provider.search(target, obj, args, ctx, info)
            },
            mutations: {
                [`${CREATE}${name}`]: (obj, args, ctx, info) => ctx.provider.create(target, obj, args, ctx, info),
                [`${UPDATE}${name}`]: (obj, args, ctx, info) => ctx.provider.create(target, obj, args, ctx, info),
                [`${REMOVE}${name}`]: (obj, args, ctx, info) => ctx.provider.create(target, obj, args, ctx, info)
            },
            navigation: {}
        };
        schemas[name] = schema;

        let simple = model;
        let navigation = {};
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
                simple += `,\n  ${property}: ${inverse}${ENTITY}`;
                navigation[property] = (obj, args, ctx, info) => ctx.provider.manyToOne(target, relation, obj, args, ctx, info);
            } else if (relation.relationType === RelationType.OneToOne) {
                rm.type = "oneToOne";
                let args = "";
                model += `,\n  ${property}${args}: ${inverse}${ENTITY} @relation(type: OneToOne)`;
                navigation[property] = (obj, args, ctx, info) => ctx.provider.oneToOne(target, relation, obj, args, ctx, info);
            } else if (relation.relationType === RelationType.OneToMany) {
                rm.type = "oneToMany";
                let temp = this.genEntity(relation.inverseEntityMetadata, schemas);
                let args = ` (${temp.search}\n  )`;
                model += `,\n  ${property}${args}: [${inverse}${ENTITY}] @relation(type: OneToMany)`;
                navigation[property] = (obj, args, ctx, info) => ctx.provider.oneToMany(target, relation, obj, args, ctx, info);
            } else {
                continue; // TODO: Implement
            }
        }
        model += "\n}";
        simple += "\n}";

        schema.model = model;
        schema.simple = simple;
        schema.navigation = navigation;
        // schema.schema = query + "\n" + mutation + "\n" + model + "\n" + inputs.join("\n");

        return schema;
    }

    private genType(target: GraphMetadata, scope: GraphType, reg: Record<string, TypeSchema>): string {
        if (GraphType.isScalar(target.type)) {
            return target.type;
        }
        if (GraphType.isRef(target.type)) {
            let type = target.target();
            let entity = EntityMetadata.get(type);
            if (entity) {
                // TODO: Makesure entity exists
                return entity.name;
            }
            let meta = TypeMetadata.get(type);
            if (meta) {
                return this.genType(meta, scope, reg);
            } else {
                return GraphType.Object;
            }
        }
        if (GraphType.isArray(target.type)) {
            let type = this.genType(target.item, scope, reg);
            if (type) {
                return `[${type}]`;
            } else {
                return `[${GraphType.Object}]`;
            }
        }
        if (GraphType.isStruc(target.type)) {
            let struc = target as TypeMetadata;
            let link = struc.target && struc.name || target.target.name;
            if (link && reg[link]) return link;
        }
        if (GraphType.isEntity(target.type) && scope === GraphType.Result) {
            // TODO: Register imports
            return target.target.name;
        }

        if (scope === GraphType.Metadata && !GraphType.isMetadata(target.type))
            throw new TypeError(`Metadata type can not reference [${target.type}]`);

        if (scope === GraphType.Input && !GraphType.isInput(target.type))
            throw new TypeError(`Input type can not reference [${target.type}]`);

        if (scope === GraphType.Result && !GraphType.isResult(target.type) && !GraphType.isEntity(target.type))
            throw new TypeError(`Result type can not reference [${target.type}]`);

        let struc = target as TypeMetadata;
        if (!GraphType.isStruc(struc.type) || !struc.fields)
            throw new TypeError(`Empty type difinition ${struc.target}`);

        // Generate schema
        let schema: TypeSchema = { target: struc, model: undefined, params: undefined, resolvers: {} };
        reg[struc.name] = schema;
        schema.params = "";
        for (let field of Object.values(struc.fields)) {
            if (!GraphType.isScalar(field.type as GraphType)) continue;
            schema.params += (schema.params ? ",\n    " : "    ") + `${field.name}: ${field.type}`;
        }
        schema.model = (scope === GraphType.Input)
            ? `input ${struc.name} @${scope.toString().toLowerCase()} {\n`
            : `type ${struc.name} @${scope.toString().toLowerCase()} {\n`;
        for (let field of Object.values(struc.fields)) {
            let type = this.genType(field, scope, reg);
            if (GraphType.isMetadata(struc.type) && GraphType.isArray(field.type)) {
                let ref = this.genType(field.item, scope, reg);
                let sch = !GraphType.isScalar(ref as GraphType) && reg[ref];
                let args = (sch && sch.params) ? `(\n${reg[ref].params}\n  )` : "";
                schema.model += `  ${field.name}${args}: ${type}\n`;
            } else {
                schema.model += `  ${field.name}: ${type}\n`;
            }
            if ((struc.target as any)[field.name] instanceof Function)
                schema.resolvers[field.name] = (struc.target as any)[field.name];
        }
        schema.model += "}";

        return struc.name;
    }

    private genApi(target: ApiMetadata): ApiSchema {
        let schema: ApiSchema = {
            target,
            api: target.alias,
            queries: undefined,
            commands: undefined
        };
        for (let method of Object.values(target.methods)) {
            if (!method.query && !method.mutation) continue;
            let input = this.genType(method.input, GraphType.Input, this.inputs);
            let result = this.genType(method.result, GraphType.Result, this.results);
            let name = `${target.target.name}_${method.name}`;
            let meta: MethodSchema = {
                target: method,
                api: target.alias,
                method: method.name,
                name,
                signature: `(args: ${input}): ${result} `
                    + `@${method.auth}(api: "${method.api.alias}", method: "${method.name}", roles: ${scalar(method.roles)})`,
                resolver: (obj, args, ctx, info) => ctx.container.invoke(meta, obj, args.args, ctx, info)
            };
            if (method.mutation) {
                schema.commands = schema.commands || {};
                schema.commands[method.name] = meta;
            } else {
                schema.queries = schema.queries || {};
                schema.queries[method.name] = meta;
            }
        }
        this.apis[schema.api] = schema;
        return schema;
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

