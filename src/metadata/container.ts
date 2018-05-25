import { MethodMetadata } from "./method";
import { TypeMetadata } from "./type";

export interface ContainerMetadata {
    authMetadata: Record<string, MethodMetadata>;
    inputMetadata: Record<string, TypeMetadata>;
    resultMetadata: Record<string, TypeMetadata>;
    resolverMetadata: Record<string, MethodMetadata>;
    httpMetadata: Record<string, MethodMetadata>;
    eventMetadata: Record<string, MethodMetadata[]>;
}