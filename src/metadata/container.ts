import { AuthMetadata } from "./auth";
import { EventMetadata } from "./event";
import { HttpMetadata } from "./http";
import { ResolverMetadata } from "./resolver";
import { TypeMetadata } from "./type";

export interface ContainerMetadata {
    authMetadata: Record<string, AuthMetadata>;
    inputMetadata: Record<string, TypeMetadata>;
    resultMetadata: Record<string, TypeMetadata>;
    resolverMetadata: Record<string, ResolverMetadata>;
    httpMetadata: Record<string, HttpMetadata>;
    eventMetadata: Record<string, EventMetadata[]>;
}