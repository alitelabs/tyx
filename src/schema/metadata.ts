import * as Lo from "lodash";
import { BooleanField, IntField, ListField, Metadata, RefField, StringField } from "../decorators/type";
import { ResolverArgs, ResolverContext, ResolverInfo } from "../graphql/types";
import { ColumnType, IColumnMetadata } from "../metadata/column";
import { IEntityMetadata } from "../metadata/entity";
import { MetadataRegistry } from "../metadata/registry";
import { IRelationMetadata, RelationType } from "../metadata/relation";
import { Class } from "../types/core";


@Metadata()
export class ColumnMetadataType implements IColumnMetadata {
    @StringField() target: Class;
    @RefField(type => EntityMetadataType) entityMetadata: IEntityMetadata;
    @StringField() propertyName: string;
    @StringField() type: ColumnType;
    @IntField() precision?: number;
    @IntField() scale?: number;
    @StringField() length: string;
    @IntField() width?: number;
    @StringField() comment: string;
    @BooleanField() isPrimary: boolean;
    @BooleanField() isNullable: boolean;
    @BooleanField() isGenerated: boolean;
    @BooleanField() isCreateDate: boolean;
    @BooleanField() isUpdateDate: boolean;
    @BooleanField() isVersion: boolean;
    @BooleanField() isVirtual: boolean;

    public static registry(root: MetadataRegistry, args: ResolverArgs, ctx: ResolverContext, info: ResolverInfo): IColumnMetadata[] {
        return Lo.filter(Object.values(root.columns), args);
    }

    public static target(parent: IColumnMetadata, args: ResolverArgs): string {
        return parent.target && `[class: ${parent.target.name}]`;
    }
}

@Metadata()
export class RelationMetadataType implements IRelationMetadata<any> {
    @StringField() target: Class;
    @RefField(type => EntityMetadataType) entityMetadata: IEntityMetadata;
    @StringField() propertyName: string;
    @StringField() relationType: RelationType;
    @RefField(type => EntityMetadataType) inverseEntityMetadata: IEntityMetadata;
    @RefField(type => RelationMetadataType) inverseRelation?: IRelationMetadata<any>;
    @ListField(type => ColumnMetadataType) joinColumns: IColumnMetadata[];

    public static registry(root: MetadataRegistry, args: ResolverArgs): IRelationMetadata[] {
        return Lo.filter(Object.values(root.relations), args);
    }

    public static target(parent: IRelationMetadata, args: ResolverArgs): string {
        return parent.target && `[class: ${parent.target.name}]`;
    }

    public static joinColumns(parent: IRelationMetadata, args: ResolverArgs): IColumnMetadata[] {
        return Lo.filter(parent.joinColumns, args);
    }
}

@Metadata()
export class EntityMetadataType implements IEntityMetadata {
    @StringField() target: Class;
    @StringField() name: string;
    @ListField(type => ColumnMetadataType) columns: IColumnMetadata[];
    @ListField(type => ColumnMetadataType) primaryColumns: IColumnMetadata[];
    @ListField(type => RelationMetadataType) relations: IRelationMetadata[];

    public static registry(root: MetadataRegistry, args: ResolverArgs): IEntityMetadata[] {
        return Lo.filter(Object.values(root.entities), args);
    }

    public static target(parent: IEntityMetadata, args: ResolverArgs): string {
        return parent.target && `[class: ${parent.target.name}]`;
    }

    public static columns(parent: IEntityMetadata, args: ResolverArgs): IColumnMetadata[] {
        return Lo.filter(parent.columns, args);
    }

    public static primaryColumns(parent: IEntityMetadata, args: ResolverArgs): IColumnMetadata[] {
        return Lo.filter(parent.primaryColumns, args);
    }

    public static relations(parent: IEntityMetadata, args: ResolverArgs): IRelationMetadata[] {
        return Lo.filter(parent.relations, args);
    }
}

// @Metadata()
// export class MethodMetadata implements IMethodMetadata {
//     target: Class;
//     name: string;

//     service: string;
//     design: DesignMetadata[];

//     auth: string;
//     roles: Roles;

//     query: boolean;
//     mutation: boolean;
//     input: GraphMetadata;
//     result: GraphMetadata;

//     contentType: string;
//     bindings: HttpBindingMetadata[];
//     http: Record<string, HttpRouteMetadata>;
//     events: Record<string, EventRouteMetadata>;
// }

// @Metadata()
// export class ApiMetadata implements IApiMetadata {
//     @StringField() target: Class;
//     @StringField() alias: string;

//     @ListField(type => MethodMetadata) methods: Record<string, MethodMetadata>;
// }