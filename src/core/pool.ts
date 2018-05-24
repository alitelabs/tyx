import { InternalServerError } from "../errors";
import { Logger } from "../logger";
import { ContainerMetadata, Proxy, Service } from "../metadata";
import { Container, ContainerState, EventRequest, EventResult, HttpRequest, HttpResponse, RemoteRequest } from "../types";
import { Configuration } from "./config";
import { ContainerInstance } from "./instance";
import { Security } from "./security";

export class ContainerPool implements Container {
    protected log: Logger;

    private application: string;
    private name: string;

    private cstate: ContainerState;

    private registers: { target: any, args: any[] }[];
    private publishes: { service: any, args: any[] }[];

    private head: ContainerInstance;
    private pool: ContainerInstance[];

    private static count = 0;

    constructor(application: string, name?: string) {
        this.application = application;
        this.name = name || ContainerPool.name;
        this.log = Logger.get(application, this.name);
        this.cstate = ContainerState.Pending;
        this.registers = [];
        this.publishes = [];
        this.pool = [];
    }

    public get state(): ContainerState {
        return this.cstate;
    }

    public get metadata(): ContainerMetadata {
        if (this.cstate !== ContainerState.Ready) return undefined;
        return this.head.metadata;
    }

    public get config(): Configuration {
        if (this.cstate !== ContainerState.Ready) return undefined;
        return this.head.get<Configuration>(Configuration);
    }

    public get security(): Security {
        if (this.cstate !== ContainerState.Ready) return undefined;
        return this.head.get<Security>(Security);
    }

    public register(resource: Object, name?: string): this;
    public register(service: Service): this;
    public register(proxy: Proxy): this;
    public register(type: Function, ...args: any[]): this;
    public register(target: Object | Service | Proxy | Function, ...args: any[]): this {
        if (this.cstate !== ContainerState.Pending) throw new InternalServerError("Invalid container state");
        this.registers.push({ target, args });
        return this;
    }

    public publish(service: Function, ...args: any[]): this;
    public publish(service: Service): this;
    public publish(service: Service | Function, ...args: any[]): this {
        if (this.cstate !== ContainerState.Pending) throw new InternalServerError("Invalid container state");
        this.publishes.push({ service, args });
        return this;
    }

    public async prepare(): Promise<ContainerInstance> {
        let instance = this.pool.find(x => x.state === ContainerState.Ready);
        if (!instance) {
            instance = new ContainerInstance(this.application, "" + ContainerPool.count++);
            // TODO: Identity

            this.registers.forEach(u => instance.register(u.target, ...u.args));
            this.publishes.forEach(p => instance.publish(p.service, ...p.args));
            await instance.prepare();

            this.pool.push(instance);
            this.head = this.head || instance;
        }
        if (this.cstate === ContainerState.Pending)
            this.cstate = ContainerState.Ready;
        return instance;
    }

    public dispose(): void {
        if (this.cstate !== ContainerState.Ready) throw new InternalServerError("Invalid container state");
        this.pool = [this.head];
    }

    public async remoteRequest(req: RemoteRequest): Promise<any> {
        if (this.cstate !== ContainerState.Ready) throw new InternalServerError("Invalid container state");
        let instance = await this.prepare();
        return instance.remoteRequest(req);
    }

    public async eventRequest(req: EventRequest): Promise<EventResult> {
        if (this.cstate !== ContainerState.Ready) throw new InternalServerError("Invalid container state");
        let instance = await this.prepare();
        return instance.eventRequest(req);
    }

    public async httpRequest(req: HttpRequest): Promise<HttpResponse> {
        if (this.cstate !== ContainerState.Ready) throw new InternalServerError("Invalid container state");
        let instance = await this.prepare();
        return instance.httpRequest(req);
    }
}

