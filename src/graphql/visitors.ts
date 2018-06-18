import { GraphQLField, GraphQLInterfaceType, GraphQLObjectType } from 'graphql';
import { SchemaDirectiveVisitor } from 'graphql-tools';

export class QueryVisitor extends SchemaDirectiveVisitor {
  constructor(config: any) { super(config); }
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
