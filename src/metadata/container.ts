import { EventMetadata } from "./event";
import { HttpMetadata } from "./http";
import { RemoteMetadata } from "./remote";
import { MethodMetadata } from "./method";

export interface ContainerMetadata {
    methods: Record<string, MethodMetadata>;
    remoteMetadata: Record<string, RemoteMetadata>;
    httpMetadata: Record<string, HttpMetadata>;
    eventMetadata: Record<string, EventMetadata[]>;
}