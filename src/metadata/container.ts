import { ApiMetadata } from "./api";
import { MethodMetadata } from "./method";
import { ProxyMetadata } from "./proxy";
import { ServiceMetadata } from "./service";

export interface ContainerMetadata {
    apis: Record<string, ApiMetadata>;
    services: Record<string, ServiceMetadata>;
    proxies: Record<string, ProxyMetadata>;
    methods: Record<string, MethodMetadata>;
    resolvers: Record<string, MethodMetadata>;
    routes: Record<string, MethodMetadata>;
    events: Record<string, MethodMetadata[]>;
}