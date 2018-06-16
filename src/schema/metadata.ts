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
