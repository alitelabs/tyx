import { MethodMetadata } from "./method";

export interface ContainerMetadata {
    methods: Record<string, MethodMetadata>;
    resolvers: Record<string, MethodMetadata>;
    routes: Record<string, MethodMetadata>;
    events: Record<string, MethodMetadata[]>;
}