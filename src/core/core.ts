import os = require('os');
import { LambdaAdapter } from '../aws/adapter';
import { LambdaHandler } from '../aws/types';
import { Di } from '../import';
import { Logger } from '../logger';
import { MetadataRegistry, Registry } from '../metadata/registry';
import { GraphQLToolkit } from '../tools/graphql';
import { Class, CommonModule, ContainerState, ModuleInfo, ObjectType, PackageInfo, ProcessInfo, ServiceInfo } from '../types/core';
import { Roles } from '../types/security';
import { Utils } from '../utils';
import { CoreGraphQL } from './graphql';
import { CoreInstance } from './instance';
import { CoreServer } from './server';
import { CoreThrift } from './thrift';

export interface CoreInterface extends MetadataRegistry {
  config: CoreOptions;
  init(options?: CoreOptions): void;
  start(port: number, basePath?: string, extraArgs?: any): void;
  get(): Promise<CoreInstance>;
  get<T>(api: ObjectType<T> | string): Promise<T>;
  activate(): Promise<CoreInstance>;
  invoke(api: string, method: string, ...args: any[]): Promise<any>;
  lambda(): LambdaHandler;
  serviceInfo(): ServiceInfo[];
  processInfo(level?: number): ProcessInfo;
  moduleInfo(): { root: ModuleInfo, modules: ModuleInfo[], packages: PackageInfo[], scriptSize: number };
}

export interface CoreOptions {
  application?: string;
  container?: string;
  version?: string;
  identity?: string;
  roles?: Roles;
  register?: Class[];
  crudAllowed?: boolean;
}

const LOAD_TIME = Math.round(process.uptime() * 1000);
const CREATED = new Date(Date.now() - Math.round(LOAD_TIME));

export abstract class Core extends Registry {
  public static readonly log = Logger.get('TYX', Core.name);

  public static readonly config: CoreOptions = {
    application: 'Core',
    container: LambdaAdapter.functionName,
    version: LambdaAdapter.functionVersion,
    identity: LambdaAdapter.identity,
    roles: { Public: true },
    register: [],
    crudAllowed: true
  };

  private static graphql: GraphQLToolkit;
  private static instance: CoreInstance;

  private static pool: CoreInstance[];
  private static counter: number = 0;
  private static serial: number = 0;
  private static cpuUsage = process.cpuUsage();

  public static readonly loadTime = LOAD_TIME;
  public static readonly created = CREATED;
  public static initTime: number;

  protected constructor() { super(); }

  public static get schema(): GraphQLToolkit {
    return (this.graphql = this.graphql || new GraphQLToolkit(Core.validate(), this.config.crudAllowed));
  }

  public static init(options?: CoreOptions): void {
    if (this.instance) return;

    this.config.application = options.application || this.config.application;
    this.config.roles = options.roles || this.config.roles;
    this.config.register = options.register || this.config.register;
    this.config.crudAllowed = options.crudAllowed !== undefined ? !!options.crudAllowed : this.config.crudAllowed;

    Object.freeze(this.config);
    Object.freeze(this.config.register);

    Core.validate();

    // TODO: Freeze registry metadata

    try {
      CoreGraphQL.init(this.config.roles);
      CoreThrift.init(this.config.roles);
      this.instance = new CoreInstance(this.config.application, Core.name);
      this.instance.initialize();
      this.pool = [this.instance];
    } catch (err) {
      this.log.error('Failed to initialize');
      this.log.error(err);
      throw err;
    } finally {
      this.initTime = Math.round(process.uptime() * 1000) - this.loadTime;
    }
  }

  public static start(port: number, basePath?: string, extraArgs?: any): void {
    return CoreServer.start(port, basePath, extraArgs);
  }

  public static async get(): Promise<CoreInstance>;
  public static async get<T>(api: ObjectType<T> | string): Promise<T>;
  public static async get<T = any>(api?: ObjectType<T> | string): Promise<T | CoreInstance> {
    const ins = await this.activate();
    return api ? ins.get(api) : ins;
  }

  public static async activate(): Promise<CoreInstance> {
    this.init();
    let instance = this.pool.find(x => x.state === ContainerState.Ready);
    try {
      if (!instance) {
        instance = new CoreInstance(this.config.application, Core.name, this.counter++);
        // console.log('Create ->', instance.name);
        await instance.initialize();
        instance.reserve();
        this.pool.push(instance);
        this.counter++;
        this.instance = this.instance || instance;
      } else {
        // console.log('Reuse ->', instance.name);
        instance.reserve();
      }
    } catch (err) {
      this.log.error('Failed to activate instance');
      this.log.error(err);
      throw err;
    }
    return instance;
  }

  public static async invoke(api: string, method: string, ...args: any[]): Promise<any> {
    const instance = await this.activate();
    return await instance.apiRequest(api, method, args);
  }

  public static lambda(): LambdaHandler {
    return LambdaAdapter.export();
  }

  public static serviceInfo(): ServiceInfo[] {
    const glob: any = Di.Container.of(undefined);
    const services = [...glob.services];
    return services;
  }

  public static processInfo(level?: number): ProcessInfo {
    const info = this.moduleInfo();
    const mem = process.memoryUsage();
    const total = process.cpuUsage();
    const usage = this.cpuUsage = process.cpuUsage(this.cpuUsage);
    const cpus = os.cpus().map(c => ({ model: c.model, speed: c.speed, ...c.times }));
    const networks = Object.entries(os.networkInterfaces())
      .map(([k, v]): [string, any] => ([k, v.filter(i => !i.internal && i.family !== 'IPv6')]))
      .filter(([k, v]) => v.length)
      .map(([k, v]) => ({ name: k, ...v[0] }));
    return {
      application: this.config.application,
      container: this.config.container,
      version: this.config.version,
      identity: this.config.identity,

      created: this.created,
      state: this.serial ? 'warm' : 'cold',
      loadTime: this.loadTime,
      initTime: this.initTime,

      timestamp: new Date(),
      serial: this.serial++,
      uptime: process.uptime(),

      memory: mem.rss,
      heapTotal: mem.heapTotal,
      heapUsed: mem.heapUsed,
      external: mem.external,
      cpuUser: usage.user,
      cpuSystem: usage.system,
      cpuUserTotal: total.user,
      cpuSystemTotal: total.system,
      packageCount: info.packages.length,
      moduleCount: info.modules.length,
      scriptSize: info.scriptSize,

      node: {
        pid: process.pid,
        arch: process.arch,
        platform: process.platform,
        release: process.release,
        versions: process.versions
      },
      cpus,
      networks,

      entry: info.root,
      packages: info.packages.filter((m: any) => level === undefined || m.level <= level),
      modules: info.modules.filter((m: any) => level === undefined || m.level <= level)
    };
  }

  public static moduleInfo(): { root: ModuleInfo, modules: ModuleInfo[], packages: PackageInfo[], scriptSize: number } {
    const cache: NodeModule[] = Object.values(require.cache);
    const packages: Record<string, PackageInfo> = {};
    const modules: Record<string, ModuleInfo> = {};
    const rootItem: CommonModule = cache[0];
    const rootFile = String(rootItem.filename || rootItem.id || rootItem.i);

    let scriptSize = 0;
    let root: ModuleInfo;

    const rootPkg: PackageInfo = {
      name: '.',
      // TODO: Find versions
      version: null,
      description: null,
      level: 0,
      size: 0,
      import: null,
      parent: null,
      moduleCount: 0,
      modules: [],
      uses: [],
      imports: [],
      path: null,
      json: null
    };
    packages['.'] = rootPkg;

    function resolve(mod: CommonModule) {
      const id = String(mod.id || mod.i);
      const file = String(mod.filename || id);
      if (modules[id]) return modules[id];
      let name = (mod === rootItem) ? id : Utils.relative(file, rootFile);
      const parent = mod.parent && modules[mod.parent.id];
      const level = parent && (parent.level + 1) || 0;
      const size = Utils.fsize(file) || 0;
      scriptSize += size;
      const info: ModuleInfo = { id, name, size, package: undefined, file, level, parent };
      modules[id] = info;
      if (mod === rootItem) {
        root = info;
        rootPkg.import = root;
      }

      const ix = name && name.indexOf('node_modules/');
      if (ix >= 0) {
        name = name.substring(ix + 13);
        const parts = name.split('/');
        const pack = parts[0] + (parts[0].startsWith('@') ? '/' + parts[1] : '');
        const path = file.substring(0, file.indexOf('node_modules/') + 13) + pack + '/package.json';
        let json: any;
        try {
          json = require(path);
        } catch (e) {
          json = { varsion: null };
        }
        const pkg: PackageInfo = packages[pack] || {
          name: pack,
          version: json && json.version || null,
          description: json && json.description || null,
          path,
          json,
          // from: parent && parent.package && parent.package.name,
          level: info.level,
          size: 0,
          moduleCount: 0,
          parent: info.parent && info.parent.package,
          import: info.parent,
          modules: [],
          imports: [],
          uses: []
        };
        info.package = pkg;
        pkg.size += info.size;
        pkg.modules.push(info);
        pkg.moduleCount++;
        pkg.level = Math.min(pkg.level, info.level);
        packages[pack] = pkg;
      } else {
        info.package = rootPkg;
        rootPkg.size += info.size;
        if (!rootPkg.moduleCount) {
          rootPkg.path = file;
        }
        rootPkg.modules.push(info);
        rootPkg.moduleCount++;
      }

      for (const item of mod.children || []) {
        const ch = resolve(item);
        if (ch.package === info.package) continue;
        if (!ch.package.uses.includes(info.package)) {
          ch.package.uses.push(info.package);
        }
        if (!info.package.imports.includes(ch.package)) {
          info.package.imports.push(ch.package);
        }
      }

      return info;
    }

    for (const mod of cache) resolve(mod);

    return {
      root,
      packages: Object.values(packages),
      modules: Object.values(modules),
      scriptSize
    };
  }
}

declare global {
  // tslint:disable-next-line:variable-name
  const Core: CoreInterface;
}
(global as any).Core = Core;
