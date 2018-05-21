import { MethodMetadata } from "./method";
import { OldEventMetadata, OldHttpMetadata } from "./old";

export interface ContainerMetadata {
    authMetadata: Record<string, MethodMetadata>;
    httpMetadata: Record<string, OldHttpMetadata>;
    eventMetadata: Record<string, OldEventMetadata[]>;
}