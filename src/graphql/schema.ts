import { GraphQLSchema } from "graphql";
import { ILogger, makeExecutableSchema } from "graphql-tools";
import { ColumnType } from "../metadata/column";
import { EntityMetadata } from "../metadata/entity";
import { MetadataRegistry } from "../metadata/registry";
import { RelationMetadata, RelationType } from "../metadata/relation";
import { GraphMetadata, GraphType, TypeMetadata } from "../metadata/type";
import { DEF_DIRECTIVES, DEF_SCALARS, DIRECTIVES } from "./base";
import { ToolkitResolver } from "./types";

export { GraphQLSchema } from "graphql";

export const MODEL = "";
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

    queries: Record<string, ToolkitResolver>;
    mutations: Record<string, ToolkitResolver>;
    navigation: Record<string, ToolkitResolver>;
}

export interface TypeSchema {
    target: TypeMetadata;
    ref: string;
    def: string;
    query: string;
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

export class CoreSchema {
    public metadata: Record<string, TypeSchema> = {};
    public entities: Record<string, EntitySchema> = {};
    public inputs: Record<string, TypeSchema> = {};
    public results: Record<string, TypeSchema> = {};
    // public services: Record<string, ServiceSchema> = {};

    constructor(registry: MetadataRegistry) {
        // Metadata
        for (let type of Object.values(registry.metadata))
            this.genType(type, GraphType.Metadata, this.metadata);
        // Entities
        for (let meta of Object.values(registry.entities))
            this.genEntity(meta, this.entities);
        // Inputs
        for (let type of Object.values(registry.inputs))
            this.genType(type, GraphType.Input, this.inputs);
        // Results
        for (let type of Object.values(registry.results))
            this.genType(type, GraphType.Result, this.results);
        // Services
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
            ${Object.values(this.metadata).map(m => m.def).join("\n")}\n
            #### Metadata Resolvers ####
            type Query {
            ${Object.values(this.metadata).map(m => m.query).join("\n")}    
            }
            type Mutation {
              reloadMetadata(role: String): JSON
            }
        \n`) + Object.values(this.entities).map((e) => {
                return `#### Entity: ${e.target.name} ####\n`
                    + `extend ${e.query}\n`
                    + `extend ${e.mutation}\n`
                    + `${e.model}\n${e.inputs.join("\n")}`;
            });
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

    public genEntity(target: EntityMetadata, schemas: Record<string, EntitySchema>): EntitySchema {
        let name = target.name;
        if (schemas[name]) return schemas[name];

        let model = `type ${name}${MODEL} @entity(rem: "TODO") {`;
        let input = `Input {`;
        let nil = `Null {`;
        let multi = `Multi {`;
        let like = `Like {`;
        let order = `Order {`;
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
        let where = `Where {\n  `
            + opers.join(",\n  ");
        let inputs = [input, where, nil, multi, like, order].map(x => `input ${name}${x}\n}`);

        let query = `type Query {\n`;
        query += `  ${GET}${name}(${keys}): ${name}${MODEL} @query(rem: "TODO"),\n`;
        query += `  ${SEARCH}${name}s(${search}\n  ): [${name}${MODEL}] @query(rem: "TODO")\n`;
        query += `}`;
        let mutation = "type Mutation {\n";
        mutation += `  ${CREATE}${name}(${create}\n  ): ${name}${MODEL},\n`;
        mutation += `  ${UPDATE}${name}(${update}\n  ): ${name}${MODEL},\n`;
        mutation += `  ${REMOVE}${name}(${keys}): ${name}${MODEL}\n`;
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
                [`${GET}${name}`]: this.findResolver(target),
                [`${SEARCH}${name}s`]: this.searchResolver(target)
            },
            mutations: {
                [`${CREATE}${name}`]: this.createResolver(target),
                [`${UPDATE}${name}`]: this.updateResolver(target),
                [`${REMOVE}${name}`]: this.removeResolver(target)
            },
            navigation: {}
        };
        schemas[name] = schema;

        let simple = model;
        let navigation = {};
        for (let rel of target.relations) {
            let property = rel.propertyName;
            let inverse = rel.inverseEntityMetadata.name;
            let rm = navigation[property] = { inverse } as any;
            // TODO: Subset of entities
            // if (!entities.find(e => e.name === target)) continue;
            if (rel.relationType === RelationType.ManyToOne) {
                rm.type = "manyToOne";
                let args = "";
                model += `,\n  ${property}${args}: ${inverse}${MODEL} @relation(type: ManyToOne)`;
                simple += `,\n  ${property}: ${inverse}${MODEL}`;
                schema.navigation[property] = this.manyToOneResolver(target, rel);
            } else if (rel.relationType === RelationType.OneToOne) {
                rm.type = "oneToOne";
                let args = "";
                model += `,\n  ${property}${args}: ${inverse}${MODEL} @relation(type: OneToOne)`;
                schema.navigation[property] = this.oneToOneResolver(target, rel);
            } else if (rel.relationType === RelationType.OneToMany) {
                rm.type = "oneToMany";
                let temp = this.genEntity(rel.inverseEntityMetadata, schemas);
                let args = ` (${temp.search}\n  )`;
                model += `,\n  ${property}${args}: [${inverse}${MODEL}] @relation(type: OneToMany)`;
                schema.navigation[property] = this.oneToManyResolver(target, rel);
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

    // TODO: Generic
    private genType(target: GraphMetadata, scope: GraphType, reg: Record<string, TypeSchema>): string {
        if (GraphType.isScalar(target.type)) {
            return target.type;
        }
        if (GraphType.isRef(target.type)) {
            let type = target.target();
            let meta = TypeMetadata.get(type);
            if (meta) {
                return this.genType(meta, scope, reg);
            } else {
                return GraphType.Object;
            }
        }
        if (GraphType.isList(target.type)) {
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
        if (GraphType.isEntity(target.type) && scope !== GraphType.Result) {
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
        let schema: TypeSchema = { target: struc, ref: struc.name, def: undefined, query: undefined };
        reg[struc.name] = schema;
        let def = scope === GraphType.Input ? `input ${struc.name} {\n` : `type ${struc.name} {\n`;
        let params = ""
        for (let field of Object.values(struc.fields)) {
            let type = this.genType(field, scope, reg);
            def += `  ${field.name}: ${type}\n`;
            if (GraphType.isScalar(type as GraphType))
                params += (params ? ",\n    " : "    ") + `${field.name}: ${type}`;
        }
        def += "}";
        schema.def = def;
        if (GraphType.isMetadata(struc.type)) schema.query = `  ${struc.name}(\n${params}\n  ): [${struc.name}]`;

        return struc.name;
    }
}

function back(text: string) {
    let lines = text.split("\n");
    let first = lines[0];
    if (!first.trim().length) first = lines[1];
    let pad = first.substr(0, first.indexOf(first.trim()));
    text = lines.map(line => line.startsWith(pad) ? line.substring(pad.length) : line).join("\n");
    return text;
}

// function ww(path) {
//     return (path.prev ? ww(path.prev) : "") + "/" + path.key;
// }

