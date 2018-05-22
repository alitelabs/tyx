import { ResolverMetadata } from ".";
import { AuthMetadata } from "./auth";
import { EventMetadata } from "./event";
import { HttpMetadata } from "./http";

export interface ContainerMetadata {
    authMetadata: Record<string, AuthMetadata>;
    resolverMetadata: Record<string, ResolverMetadata>;
    httpMetadata: Record<string, HttpMetadata>;
    eventMetadata: Record<string, EventMetadata[]>;
}