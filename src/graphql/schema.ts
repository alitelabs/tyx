import { GraphQLField, GraphQLInterfaceType, GraphQLObjectType, GraphQLSchema } from "graphql";
import { GraphQLDate, GraphQLDateTime, GraphQLTime } from "graphql-iso-date";
import { ILogger, SchemaDirectiveVisitor, makeExecutableSchema } from "graphql-tools";
import { GraphQLResolveInfo } from "graphql/type/definition";
import { EntityMetadata } from "typeorm/metadata/EntityMetadata";
import { ToolkitArgs, ToolkitQuery } from "./query";
import GraphQLJSON = require("graphql-type-json");

export { GraphQLSchema } from "graphql";

// ID: The ID scalar type represents a unique identifier
// Int: A signed 32‐bit integer.
// Float: A signed double-precision floating-point value.
// String: A UTF‐8 character sequence.
// Boolean: true or false.

const STRING = "String";
const INT = "Int";
const FLOAT = "Float";
const DATE = "Date";
// const DATETIME = "DateTime";

// TODO: Find the mapping in typeorm
const typeMap: Record<string, string> = {
    "varchar": STRING,
    "mediumtext": STRING,
    "int": INT,
    "decimal": FLOAT,
    "datetime": DATE
};

export const SYS_COLUMNS = ["created", "updated", "version"];

export const MODEL = "";
export const GET = "get";
export const SEARCH = "";
export const CREATE = "create";
export const UPDATE = "update";
export const REMOVE = "remove";

export interface EntitySchema {
    query?: string;
    mutation?: string;
    model: string;
    prisma?: string;
    inputs?: string[];
    schema?: string;
    relations?: Record<string, { target: string, type: string }>;
    args: {
        keys?: string;
        search?: string;
        create?: string;
        update?: string;
    };
}

export interface ServiceSchema {
    service: string;
    methods: Record<string, MethodSchema>;
}

export interface MethodSchema {
    method: string;
    signature: string;
    resolver: ToolkitResolver;
}

export type ToolkitInfo = GraphQLResolveInfo;

export interface ToolkitContext {
    provider: ToolkitProvider;
    results?: Record<string, any[]>;
}

export interface ToolkitResolver {
    (obj: any, args: ToolkitQuery & ToolkitArgs, ctx: ToolkitContext, info: ToolkitInfo): Promise<any>;
}

export interface ToolkitMutation {
    (target: string, obj: any, args: ToolkitQuery & ToolkitArgs, ctx: ToolkitContext, info: ToolkitInfo): Promise<any>;
}

export interface ToolkitRead {
    (type: string, obj: ToolkitArgs, args: ToolkitArgs, context: ToolkitContext, info?: ToolkitInfo): Promise<any>;
}

export interface ToolkitRelation {
    (type: string, rel: string, root: ToolkitArgs, query: ToolkitQuery, context?: ToolkitContext, info?: ToolkitInfo): Promise<any>;
}

export interface ToolkitProvider {
    create: ToolkitMutation;
    update: ToolkitMutation;
    remove: ToolkitMutation;
    get: ToolkitRead;
    search: ToolkitRead;
    oneToMany: ToolkitRelation;
    oneToOne: ToolkitRelation;
    manyToOne: ToolkitRelation;
}

export class QueryVisitor extends SchemaDirectiveVisitor {
    constructor(config) { super(config); }
    public visitFieldDefinition(field: GraphQLField<any, any>, details: {
        objectType: GraphQLObjectType | GraphQLInterfaceType;
    }): GraphQLField<any, any> | void {
        // let resolve = field.resolve;
        // field.resolve = async (obj, args, context, info) => {
        //     let res = await resolve.call(field, obj, args, context, info);
        //     // context.results = { [ww(info.path)]: res };
        //     return res;
        // };
    }
}

export class RelationVisitor extends SchemaDirectiveVisitor {
    public visitFieldDefinition(field: GraphQLField<any, any>, details: {
        objectType: GraphQLObjectType | GraphQLInterfaceType;
    }): GraphQLField<any, any> | void {
        // let resolve = field.resolve;
        // field.resolve = async (obj, args, context, info) => {
        //     let res = await resolve.call(field, obj, args, context, info);
        //     if (args.exists && res.length === 0) {
        //         let gp = ww(info.path.prev.prev);
        //         let ar = context.results[gp];
        //         delete ar[info.path.prev.key];
        //     } else {
        //         context.results[ww(info.path)] = res;
        //     }
        //     return res;
        // };
    }
}

export class ToolkitSchema {
    public static SCALARS = {
        Date: GraphQLDate,
        Time: GraphQLTime,
        DateTime: GraphQLDateTime,
        JSON: GraphQLJSON
    };

    public static DIRECTIVES = {
        // entity: ToolkitVisitor,
        // column: RelationVisitor,
        query: QueryVisitor,
        relation: RelationVisitor
    };

    public static DEF_SCALARS = Object.keys(ToolkitSchema.SCALARS).map(s => `scalar ${s}`).join("\n");

    public static DEF_DIRECTIVES = back("        ", `
        enum RelationType {
            OneToOne,
            OneToMany,
            ManyToOne
        }
        directive @entity(rem: String) on OBJECT
        directive @column(rem: String) on OBJECT
        directive @relation(type: RelationType) on FIELD_DEFINITION
        directive @query(type: RelationType) on FIELD_DEFINITION
    `);


    public entities: Record<string, EntitySchema> = {};
    public services: Record<string, ServiceSchema> = {};

    constructor(entities: EntityMetadata[]) {
        let schema = this;
        for (let meta of entities) {
            let target = meta.name;
            let entry = schema.entities[target] = this.genEntity(meta);
            // Roots
            entry.query = `type Query {\n`;
            entry.query += `  ${GET}${target}(${entry.args.keys}): ${target}${MODEL} @query(rem: "TODO"),\n`;
            entry.query += `  ${SEARCH}${target}s(${entry.args.search}\n  ): [${target}${MODEL}] @query(rem: "TODO")\n`;
            entry.query += `}`;
            entry.mutation = "type Mutation {\n";
            entry.mutation += `  ${CREATE}${target}(${entry.args.create}\n  ): ${target}${MODEL},\n`;
            entry.mutation += `  ${UPDATE}${target}(${entry.args.update}\n  ): ${target}${MODEL},\n`;
            entry.mutation += `  ${REMOVE}${target}(${entry.args.keys}): ${target}${MODEL}\n`;
            entry.mutation += "}";
        }
        for (let meta of entities) {
            let entity = schema.entities[meta.name];
            entity.prisma = entity.model;
            entity.relations = {};
            for (let rel of meta.relations) {
                let target = rel.inverseEntityMetadata.name;
                let rm = entity.relations[rel.propertyName] = { target } as any;
                if (!entities.find(e => e.name === target)) continue;
                if (rel.isManyToOne) {
                    rm.type = "manyToOne";
                    let args = "";
                    entity.model += `,\n  ${rel.propertyName}${args}: ${target}${MODEL} @relation(type: ManyToOne)`;
                    entity.prisma += `,\n  ${rel.propertyName}: ${target}${MODEL}`;
                } else if (rel.isOneToOne) {
                    rm.type = "oneToOne";
                    let args = "";
                    entity.model += `,\n  ${rel.propertyName}${args}: ${target}${MODEL} @relation(type: OneToOne)`;
                } else if (rel.isOneToMany) {
                    rm.type = "oneToMany";
                    let args = (rel.isOneToMany) ? ` (${schema.entities[target].args.search}\n  )` : "";
                    entity.model += `,\n  ${rel.propertyName}${args}: [${target}${MODEL}] @relation(type: OneToMany)`;
                } else {
                    continue; // TODO: Implement
                }
            }
            entity.model += "\n}";
            entity.prisma += "\n}";
            entity.schema = entity.query + "\n" + entity.mutation + "\n" + entity.model + "\n" + entity.inputs.join("\n");
        }
        // "type _DebugInfo {\n  where: String,\n  order: String,\n  sql: String\n}",
        return schema;
    }

    public genEntity(meta: EntityMetadata): EntitySchema {
        let target = meta.name;
        let model = `type ${target}${MODEL} @entity(rem: "TODO") {`;
        let input = `Input {`;
        let nil = `Null {`;
        let multi = `Multi {`;
        let like = `Like {`;
        let order = `Order {`;
        let keys = "";
        let create = ``;
        let update = ``;
        let first = true;
        for (let col of meta.columns) {
            let pn = col.propertyName;
            let dt = typeMap[col.type.toString()];
            if (!dt) throw new Error("Unknown type: " + col.type);
            let nl = !col.isNullable ? "!" : "";
            if (col.propertyName.endsWith("Id")) dt = "ID";
            model += `${first ? "" : ","}\n  ${pn}: ${dt}${nl}`;
            if (col.isPrimary)
                keys += `${first ? "" : ", "}${pn}: ${dt}${nl}`;
            input += `${first ? "" : ","}\n  ${pn}: ${dt}`;
            nil += `${first ? "" : ","}\n  ${pn}: Boolean`;
            multi += `${first ? "" : ","}\n  ${pn}: [${dt}!]`;
            like += `${first ? "" : ","}\n  ${pn}: String`;
            order += `${first ? "" : ","}\n  ${pn}: Int`;
            update += `${first ? "" : ","}\n    ${pn}: ${dt}${col.isPrimary ? "!" : ""}`;
            if (SYS_COLUMNS.includes(pn)) nl = "";
            create += `${first ? "" : ","}\n    ${pn}: ${dt}${nl}`;
            first = false;
        }
        // Debug field
        // model += `,\n  _exclude: Boolean`;
        // model += `,\n  _debug: _DebugInfo`;
        let opers = [
            `if: ${target}Input`,
            `eq: ${target}Input`,
            `ne: ${target}Input`,
            `gt: ${target}Input`,
            `gte: ${target}Input`,
            `lt: ${target}Input`,
            `lte: ${target}Input`,
            `like: ${target}Like`,
            `nlike: ${target}Like`,
            `rlike: ${target}Like`,
            `in: ${target}Multi`,
            `nin: ${target}Multi`,
            `not: ${target}Where`,
            `nor: ${target}Where`,
            `nil: ${target}Null`, // TODO
            `and: [${target}Where]`,
            `or: [${target}Where]`,
        ];
        let search = `\n    `
            + opers.join(",\n    ")
            + `,\n    order: ${target}Order,`
            + `\n    skip: Int,`
            + `\n    take: Int,`
            + `\n    exists: Boolean`;
        let where = `Where {\n  `
            + opers.join(",\n  ");
        let inputs = [input, where, nil, multi, like, order].map(x => `input ${target}${x}\n}`);
        return { model, inputs, args: { create, update, keys, search } };
    }

    public addServiceMethod(service: string, method: string, resolver: ToolkitResolver) {
        let def = this.services[service] = this.services[service] || { service, methods: {} };
        let signature = `${service}_${method}(req: JSON): JSON`
        def.methods[method] = {
            method,
            resolver,
            signature
        };
    }

    public serviceDefs(): string {
        // TODO: Types
        let schema = "type Mutation {";
        let first = true;
        for (let service of Object.values(this.services)) {
            for (let method of Object.values(service.methods)) {
                schema += `${first ? "" : ","}\n  ` + method.signature;
                first = false;
            }
        }
        schema += "\n}";
        return schema;
    }

    public executable(logger?: ILogger): GraphQLSchema {
        return makeExecutableSchema({
            typeDefs: this.typeDefs(),
            resolvers: this.resolvers(),
            schemaDirectives: ToolkitSchema.DIRECTIVES,
            logger
        });
    }

    public types() {
        return Object.values(this.entities).map((s, i) =>
            s.prisma
        ).join("\n\n");
    }

    public typeDefs(): string {
        return ToolkitSchema.DEF_SCALARS + "\n"
            + ToolkitSchema.DEF_DIRECTIVES + "\n"
            + Object.values(this.entities).map((s, i) =>
                `${i ? "extend " : ""}${s.query}\n`
                + `${i ? "extend " : ""}${s.mutation}\n`
                + `${s.model}\n${s.inputs.join("\n")}`
            ).join("\n\n")
            + "\n\nextend " + this.serviceDefs() + "\n";
    }

    public resolvers() {
        let resolvers = { Query: {}, Mutation: {} };
        for (let entry of Object.entries(this.entities)) {
            let target = entry[0];
            resolvers.Query[`${GET}${target}`] = (obj, args, ctx, info) => ctx.provider.get(target, obj, args, ctx, info);
            resolvers.Query[`${SEARCH}${target}s`] = (obj, args, ctx, info) => ctx.provider.search(target, obj, args, ctx, info);
            resolvers.Mutation[`${CREATE}${target}`] = (obj, args, ctx, info) => ctx.provider.create(target, obj, args, ctx, info);
            resolvers.Mutation[`${UPDATE}${target}`] = (obj, args, ctx, info) => ctx.provider.update(target, obj, args, ctx, info);
            resolvers.Mutation[`${REMOVE}${target}`] = (obj, args, ctx, info) => ctx.provider.remove(target, obj, args, ctx, info);
            let resolver = resolvers[target + MODEL] = {};
            for (let item of Object.entries(entry[1].relations)) {
                let res: ToolkitResolver;
                let rel = item[0];
                switch (item[1].type) {
                    case "oneToMany": res = (obj, args, ctx, info) => ctx.provider.oneToMany(target, rel, obj, args, ctx, info); break;
                    case "manyToOne": res = (obj, args, ctx, info) => ctx.provider.manyToOne(target, rel, obj, args, ctx, info); break;
                    case "oneToOne": res = (obj, args, ctx, info) => ctx.provider.oneToOne(target, rel, obj, args, ctx, info); break;
                    default: continue;
                }
                resolver[rel] = res;
            }
        }
        for (let service of Object.values(this.services)) {
            for (let method of Object.values(service.methods)) {
                resolvers.Mutation[service.service + "_" + method.method] = method.resolver;
            }
        }
        return resolvers;
    }
}

function back(prefix: string, text: string) {
    return text.split("\n").map(line => line.replace(prefix, "")).join("\n").trim();
}

// function ww(path) {
//     return (path.prev ? ww(path.prev) : "") + "/" + path.key;
// }

