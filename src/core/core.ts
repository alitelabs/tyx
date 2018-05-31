import { Server, createServer } from "http";
import { LambdaAdapter, LambdaHandler } from "../aws/adapter";
import { ExpressAdapter } from "../express/adapter";
import { Express } from "../import";
import { ConnectionOptions, createConnection, getConnection } from "../import/typeorm";
import { Logger } from "../logger";
import { Registry } from "../metadata/registry";
import { Class, ContainerState } from "../types/core";
import { EventRequest, EventResult } from "../types/event";
import { HttpRequest, HttpResponse } from "../types/http";
import { RemoteRequest } from "../types/proxy";
import { CoreInstance } from "./instance";

export abstract class Core {
    public static log = Logger.get("TYX", Core.name);;

    private static application: string;
    private static instance: CoreInstance;

    private static pool: CoreInstance[];
    private static counter: number;

    private static server: Server;

    private constructor() { }

    public static get metadata(): Registry {
        return Registry.get();
    }

    public static register(...args: Class[]) { }

    public static async init(application?: string, args?: Class[]) {
        this.application = this.application || application || "Core";
        if (this.instance) return;
        this.pool = [];

        let cfg: string = process.env.DATABASE;
        // this.label = options.substring(options.indexOf("@") + 1);
        let tokens = cfg.split(/:|@|\/|;/);
        let logQueries = tokens.findIndex(x => x === "logall") > 5;
        // let name = (this.config && this.config.appId || "tyx") + "#" + (++DatabaseProvider.instances);
        let options: ConnectionOptions = {
            name: "default",
            username: tokens[0],
            password: tokens[1],
            type: tokens[2] as any,
            host: tokens[3],
            port: +tokens[4],
            database: tokens[5],
            // timezone: "Z",
            logging: logQueries ? "all" : ["error"],
            entities: Object.values(Registry.entities).map(meta => meta.target)
        };
        await createConnection(options);

        this.instance = new CoreInstance(application, "Core");
        this.instance.prepare();
    }

    private static async activate(): Promise<CoreInstance> {
        await this.init();
        let instance = this.pool.find(x => x.state === ContainerState.Ready);
        if (!instance) {
            instance = new CoreInstance(this.application, "" + this.counter++);
            // TODO: Identity
            await instance.prepare();
            this.pool.push(instance);
            this.instance = this.instance || instance;
        }
        return instance;
    }

    public static async remoteRequest(req: RemoteRequest): Promise<any> {
        try {
            let instance = await this.activate();
            return instance.remoteRequest(req);
        } finally {
            this.release();
        }
    }

    public static async eventRequest(req: EventRequest): Promise<EventResult> {
        try {
            let instance = await this.activate();
            return instance.eventRequest(req);
        } finally {
            this.release();
        }
    }

    public static async httpRequest(req: HttpRequest): Promise<HttpResponse> {
        try {
            let instance = await this.activate();
            return instance.httpRequest(req);
        } finally {
            this.release();
        }
    }

    private static async release() {
        if (!this.server) await getConnection().close();
    }

    public static lambda(): LambdaHandler {
        return new LambdaAdapter().export();
    }

    public static express(basePath?: string): Express.Express {
        return new ExpressAdapter(basePath || "").express();
    }

    public static start(port: number, basePath?: string) {
        port = port || 5000;
        let adapter = new ExpressAdapter(basePath || "");

        let app = adapter.express();
        this.server = createServer(app);
        this.server.listen(port);

        this.log.info("👌  Server initialized.");
        adapter.paths.forEach(p => this.log.info(`${p[0]} http://localhost:${port}/${p[1]}`));
        this.log.info("🚀  Server started at %s ...", port);
    }

    public static stop() {
        if (this.server) this.server.close();
        getConnection().close();
    }
}

