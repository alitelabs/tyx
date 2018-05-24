import { ResolverMetadata, GraphMetadata } from ".";
import { AuthMetadata } from "./auth";
import { EventMetadata } from "./event";
import { HttpMetadata } from "./http";

export interface ContainerMetadata {
    authMetadata: Record<string, AuthMetadata>;
    inputMetadata: Record<string, GraphMetadata>;
    resultMetadata: Record<string, GraphMetadata>;
    resolverMetadata: Record<string, ResolverMetadata>;
    httpMetadata: Record<string, HttpMetadata>;
    eventMetadata: Record<string, EventMetadata[]>;
}