import { GraphQLBoolean, GraphQLField, GraphQLFloat, GraphQLInt, GraphQLInterfaceType, GraphQLObjectType, GraphQLScalarType, GraphQLSchema, GraphQLString } from "graphql";
import { GraphQLDate, GraphQLDateTime, GraphQLTime } from "graphql-iso-date";
import { ILogger, makeExecutableSchema, SchemaDirectiveVisitor } from "graphql-tools";
import { GraphQLResolveInfo } from "graphql/type/definition";
import { ColumnType } from "../metadata/column";
import { EntityMetadata } from "../metadata/entity";
import { RelationType } from "../metadata/relation";
import { GraphType } from "../metadata/type";
import { ToolkitArgs, ToolkitQuery } from "./query";
import GraphQLJSON = require("graphql-type-json");


export { GraphQLSchema } from "graphql";

export const SYS_COLUMNS = ["created", "updated", "version"];

export const MODEL = "";
export const GET = "";
export const SEARCH = "";
export const CREATE = "create";
export const UPDATE = "update";
export const REMOVE = "remove";

export interface EntitySchema {
    query: string;
    mutation: string;
    model: string;
    inputs: string[];
    search: string;
    simple?: string;

    // get: ToolkitResolver;
    // sea

    relations?: Record<string, { target: string, type: string }>;
    // schema?: string;
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
    public static SCALARS: Record<string, GraphQLScalarType> = {
        Date: GraphQLDate,
        Time: GraphQLTime,
        DateTime: GraphQLDateTime,
        JSON: GraphQLJSON,
        string: GraphQLString,
        number: GraphQLFloat,
        int: GraphQLInt,
        boolean: GraphQLBoolean
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
    public inputs: Record<string, string> = {};
    public results: Record<string, string> = {};
    public services: Record<string, ServiceSchema> = {};

    constructor(entities: EntityMetadata[]) {
        for (let meta of entities) this.genEntity(meta, this.entities);
    }

    public genEntity(meta: EntityMetadata, schemas: Record<string, EntitySchema>): EntitySchema {
        let target = meta.name;
        if (schemas[target]) return schemas[target];

        let model = `type ${target}${MODEL} @entity(rem: "TODO") {`;
        let input = `Input {`;
        let nil = `Null {`;
        let multi = `Multi {`;
        let like = `Like {`;
        let order = `Order {`;
        let keys = "";
        let create = ``;
        let update = ``;
        let cm = true;
        for (let col of meta.columns) {
            let pn = col.propertyName;
            let dt = ColumnType.graphType(col.type);
            let nl = !col.isNullable ? "!" : "";
            if (col.propertyName.endsWith("Id")) dt = GraphType.ID;
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

        let query = `type Query {\n`;
        query += `  ${GET}${target}(${keys}): ${target}${MODEL} @query(rem: "TODO"),\n`;
        query += `  ${SEARCH}${target}s(${search}\n  ): [${target}${MODEL}] @query(rem: "TODO")\n`;
        query += `}`;
        let mutation = "type Mutation {\n";
        mutation += `  ${CREATE}${target}(${create}\n  ): ${target}${MODEL},\n`;
        mutation += `  ${UPDATE}${target}(${update}\n  ): ${target}${MODEL},\n`;
        mutation += `  ${REMOVE}${target}(${keys}): ${target}${MODEL}\n`;
        mutation += "}";

        let schema: EntitySchema = { query, mutation, model, inputs, search };
        schemas[target] = schema;

        let simple = model;
        let relations = {};
        for (let rel of meta.relations) {
            let inverse = rel.inverseEntityMetadata.name;
            let rm = relations[rel.propertyName] = { inverse } as any;
            // TODO: Subset of entities
            // if (!entities.find(e => e.name === target)) continue;
            if (rel.relationType === RelationType.ManyToOne) {
                rm.type = "manyToOne";
                let args = "";
                model += `,\n  ${rel.propertyName}${args}: ${inverse}${MODEL} @relation(type: ManyToOne)`;
                simple += `,\n  ${rel.propertyName}: ${inverse}${MODEL}`;
            } else if (rel.relationType === RelationType.OneToOne) {
                rm.type = "oneToOne";
                let args = "";
                model += `,\n  ${rel.propertyName}${args}: ${inverse}${MODEL} @relation(type: OneToOne)`;
            } else if (rel.relationType === RelationType.OneToMany) {
                rm.type = "oneToMany";
                let temp = this.genEntity(rel.inverseEntityMetadata, schemas);
                let args = (rel.relationType === RelationType.OneToMany) ? ` (${temp.search}\n  )` : "";
                model += `,\n  ${rel.propertyName}${args}: [${inverse}${MODEL}] @relation(type: OneToMany)`;
            } else {
                continue; // TODO: Implement
            }
        }
        model += "\n}";
        simple += "\n}";

        schema.model = model;
        schema.simple = simple;
        schema.relations = relations;
        // schema.schema = query + "\n" + mutation + "\n" + model + "\n" + inputs.join("\n");

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
            s.simple
        ).join("\n\n");
    }

    public typeDefs(): string {
        return ToolkitSchema.DEF_SCALARS + "\n"
            + ToolkitSchema.DEF_DIRECTIVES + "\n"
            + Object.values(this.entities).map((s, i) =>
                `${i ? "extend " : ""}${s.query}\n`
                + `${i ? "extend " : ""}${s.mutation}\n`
                + `${s.model}\n${s.inputs.join("\n")}`
            ).join("\n\n");
        // "\n\n this.serviceDefs() + "\n";
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
        return resolvers;
    }
}

function back(prefix: string, text: string) {
    return text.split("\n").map(line => line.replace(prefix, "")).join("\n").trim();
}

// function ww(path) {
//     return (path.prev ? ww(path.prev) : "") + "/" + path.key;
// }

