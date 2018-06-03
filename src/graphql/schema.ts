import { GraphQLField, GraphQLInterfaceType, GraphQLObjectType, GraphQLScalarType, GraphQLSchema } from "graphql";
import { GraphQLDate, GraphQLDateTime, GraphQLTime } from "graphql-iso-date";
import { makeExecutableSchema, SchemaDirectiveVisitor } from "graphql-tools";
import { GraphQLResolveInfo } from "graphql/type/definition";
import { ColumnType } from "../metadata/column";
import { EntityMetadata } from "../metadata/entity";
import { MetadataRegistry } from "../metadata/registry";
import { RelationMetadata, RelationType } from "../metadata/relation";
import { GraphMetadata, GraphType, TypeMetadata } from "../metadata/type";
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
    entity: EntityMetadata;

    query: string;
    mutation: string;
    model: string;
    inputs: string[];
    search: string;
    simple: string;
    relations: Record<string, { target: string, type: string }>;

    queries: Record<string, ToolkitResolver>;
    mutations: Record<string, ToolkitResolver>;
    navigation: Record<string, ToolkitResolver>;
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
    (entity: EntityMetadata, obj: any, args: ToolkitQuery & ToolkitArgs, ctx: ToolkitContext, info: ToolkitInfo): Promise<any>;
}

export interface ToolkitRead {
    (entity: EntityMetadata, obj: ToolkitArgs, args: ToolkitArgs, context: ToolkitContext, info?: ToolkitInfo): Promise<any>;
}

export interface ToolkitRelation {
    (entity: EntityMetadata, rel: RelationMetadata, root: ToolkitArgs, query: ToolkitQuery, context?: ToolkitContext, info?: ToolkitInfo): Promise<any>;
}

export interface ToolkitProvider {
    get: ToolkitRead;
    search: ToolkitRead;
    create: ToolkitMutation;
    update: ToolkitMutation;
    remove: ToolkitMutation;
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

export class CoreSchema {
    public static SCALARS: Record<string, GraphQLScalarType> = {
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

    public static DEF_SCALARS = Object.keys(CoreSchema.SCALARS).map(s => `scalar ${s}`).join("\n");

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

    // public inputs: Record<string, string> = {};
    // public results: Record<string, string> = {};
    // public services: Record<string, ServiceSchema> = {};

    constructor(entities: EntityMetadata[]) {
        // Metdata
        for (let meta of entities) this.genEntity(meta, this.entities);
        // Inputs
        // Results
        // Services
    }

    public genEntity(entity: EntityMetadata, schemas: Record<string, EntitySchema>): EntitySchema {
        let target = entity.name;
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
        for (let col of entity.columns) {
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

        let schema: EntitySchema = {
            entity,

            query,
            mutation,
            model,
            inputs,
            search,
            simple: model,
            relations: {},
            queries: {
                [`${GET}${target}`]: this.findResolver(entity),
                [`${SEARCH}${target}s`]: this.searchResolver(entity)
            },
            mutations: {
                [`${CREATE}${target}`]: this.createResolver(entity),
                [`${UPDATE}${target}`]: this.updateResolver(entity),
                [`${REMOVE}${target}`]: this.removeResolver(entity)
            },
            navigation: {}
        };
        schemas[target] = schema;

        let simple = model;
        let navigation = {};
        for (let rel of entity.relations) {
            let inverse = rel.inverseEntityMetadata.name;
            let rm = navigation[rel.propertyName] = { inverse } as any;
            // TODO: Subset of entities
            // if (!entities.find(e => e.name === target)) continue;
            if (rel.relationType === RelationType.ManyToOne) {
                rm.type = "manyToOne";
                let args = "";
                model += `,\n  ${rel.propertyName}${args}: ${inverse}${MODEL} @relation(type: ManyToOne)`;
                simple += `,\n  ${rel.propertyName}: ${inverse}${MODEL}`;
                schema.navigation[rel.propertyName] = this.manyToOneResolver(entity, rel);
            } else if (rel.relationType === RelationType.OneToOne) {
                rm.type = "oneToOne";
                let args = "";
                model += `,\n  ${rel.propertyName}${args}: ${inverse}${MODEL} @relation(type: OneToOne)`;
                schema.navigation[rel.propertyName] = this.oneToOneResolver(entity, rel);
            } else if (rel.relationType === RelationType.OneToMany) {
                rm.type = "oneToMany";
                let temp = this.genEntity(rel.inverseEntityMetadata, schemas);
                let args = ` (${temp.search}\n  )`;
                model += `,\n  ${rel.propertyName}${args}: [${inverse}${MODEL}] @relation(type: OneToMany)`;
                schema.navigation[rel.propertyName] = this.oneToManyResolver(entity, rel);
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

    public resolvers() {
        let resolvers = { Query: {}, Mutation: {} };
        for (let entry of Object.entries(this.entities)) {
            let target = entry[0];
            let schema = entry[1];
            resolvers.Query = { ...resolvers.Query, ...schema.queries, [target + MODEL]: schema.navigation };
            resolvers.Mutation = { ...resolvers.Mutation, ...schema.mutations };
        }
        return resolvers;
    }

    private findResolver(entity: EntityMetadata): ToolkitResolver {
        return (obj, args, ctx, info) => ctx.provider.get(entity, obj, args, ctx, info);
    }

    private searchResolver(entity: EntityMetadata): ToolkitResolver {
        return (obj, args, ctx, info) => ctx.provider.search(entity, obj, args, ctx, info);
    }

    private createResolver(entity: EntityMetadata): ToolkitResolver {
        return (obj, args, ctx, info) => ctx.provider.create(entity, obj, args, ctx, info);
    }

    private updateResolver(entity: EntityMetadata): ToolkitResolver {
        return (obj, args, ctx, info) => ctx.provider.update(entity, obj, args, ctx, info);
    }

    private removeResolver(entity: EntityMetadata): ToolkitResolver {
        return (obj, args, ctx, info) => ctx.provider.remove(entity, obj, args, ctx, info);
    }

    private oneToManyResolver(entity: EntityMetadata, relation: RelationMetadata): ToolkitResolver {
        return (obj, args, ctx, info) => ctx.provider.oneToMany(entity, relation, obj, args, ctx, info)
    }

    private manyToOneResolver(entity: EntityMetadata, relation: RelationMetadata): ToolkitResolver {
        return (obj, args, ctx, info) => ctx.provider.manyToOne(entity, relation, obj, args, ctx, info)
    }

    private oneToOneResolver(entity: EntityMetadata, relation: RelationMetadata): ToolkitResolver {
        return (obj, args, ctx, info) => ctx.provider.oneToOne(entity, relation, obj, args, ctx, info)
    }

    public executable(logger?: ILogger): GraphQLSchema {
        return makeExecutableSchema({
            typeDefs: this.typeDefs(),
            resolvers: this.resolvers(),
            schemaDirectives: CoreSchema.DIRECTIVES,
            logger
        });
    }

    public typeDefs(): string {
        return CoreSchema.DEF_SCALARS + "\n"
            + CoreSchema.DEF_DIRECTIVES + "\n"
            + Object.values(this.entities).map((s, i) =>
                `${i ? "extend " : ""}${s.query}\n`
                + `${i ? "extend " : ""}${s.mutation}\n`
                + `${s.model}\n${s.inputs.join("\n")}`
            ).join("\n\n");
        // "\n\n this.serviceDefs() + "\n";
    }

    public api(registry: MetadataRegistry): string {
        let schema: string[] = [];
        let query: string[] = [];

        schema.push("### Metadata Types");
        let metaReg: Record<string, TypeMetadata> = {};
        for (let type of Object.values(registry.metadata)) {
            resolve(type, GraphType.Metadata, metaReg);
        }

        schema.push("\n### Input Types");
        let inputReg: Record<string, TypeMetadata> = {};
        for (let type of Object.values(registry.inputs)) {
            resolve(type, GraphType.Input, inputReg);
        }

        schema.push("\n### Result Types");
        let resultReg: Record<string, TypeMetadata> = {};
        for (let type of Object.values(registry.results)) {
            resolve(type, GraphType.Result, resultReg);
        }

        return "Query {\n" + query.join("\n") + "\n}\n\n" + schema.join("\n");

        // TODO: Generic
        function resolve(meta: GraphMetadata, scope: GraphType, reg: Record<string, TypeMetadata>): GraphMetadata {
            if (GraphType.isScalar(meta.type)) {
                meta.ref = meta.type;
                return meta;
            }
            if (meta.target && reg[meta.target.name]) {
                return reg[meta.target.name];
            }
            if (GraphType.isRef(meta.type)) {
                let type = meta.target();
                let target = TypeMetadata.get(type);
                if (target) {
                    target = resolve(target, scope, reg) as TypeMetadata;
                    meta.ref = target.ref;
                } else {
                    meta.ref = GraphType.Object;
                }
                return meta;
            }
            if (GraphType.isList(meta.type)) {
                let type = resolve(meta.item, scope, reg);
                if (type) {
                    meta.ref = `[${type.ref}]`;
                } else {
                    meta.ref = `[${GraphType.Object}]`;
                }
                return meta;
            }
            if (GraphType.isEntity(meta.type) && scope !== GraphType.Result) {
                // TODO: Register imports
                meta.ref = meta.target.name;
                return meta;
            }

            if (scope === GraphType.Metadata && !GraphType.isMetadata(meta.type))
                throw new TypeError(`Metadata type can not reference [${meta.type}]`);

            if (scope === GraphType.Input && !GraphType.isInput(meta.type))
                throw new TypeError(`Input type can not reference [${meta.type}]`);

            if (scope === GraphType.Result && !GraphType.isResult(meta.type) && !GraphType.isEntity(meta.type))
                throw new TypeError(`Result type can not reference [${meta.type}]`);

            let struc = meta as TypeMetadata;
            if (!GraphType.isStruc(struc.type) || !struc.fields)
                throw new TypeError(`Empty type difinition ${struc.target}`);

            // Generate schema
            struc.ref = struc.name;
            reg[struc.ref] = struc;
            reg[struc.target.name] = struc;
            let def = scope === GraphType.Input ? `input ${struc.name} {\n` : `type ${struc.name} {\n`;
            let params = ""
            for (let [key, field] of Object.entries(struc.fields)) {
                let res = resolve(field, scope, reg);
                def += `  ${key}: ${res.ref}\n`;
                if (GraphType.isScalar(res.type))
                    params += (params ? ", " : "") + `${key}: ${res.type}`;
            }
            def += "}";
            schema.push(def);
            if (GraphType.isMetadata(struc.type)) query.push(`  ${struc.name}(${params})`);

            return meta;
        }
    }
}

function back(prefix: string, text: string) {
    return text.split("\n").map(line => line.replace(prefix, "")).join("\n").trim();
}

// function ww(path) {
//     return (path.prev ? ww(path.prev) : "") + "/" + path.key;
// }

