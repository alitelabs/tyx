import { Debug, Utils } from 'exer';
import { ApiMetadata } from '../metadata/api';
import { DatabaseMetadata } from '../metadata/database';
import { EntityMetadata } from '../metadata/entity';
import { EnumMetadata } from '../metadata/enum';
import { Registry } from '../metadata/registry';
import { RelationType } from '../metadata/relation';
import { TypeMetadata, TypeSelect } from '../metadata/type';
import { VarKind } from '../metadata/var';
import { CoreSchema } from '../schema/registry';
import { Tson } from './tson';

interface DatabaseSchema {
  metadata: DatabaseMetadata;
  name: string;
  alias: string;
  entities: Record<string, EntitySchema>;
  // query: string;
  // meta: string;
  // model: string;
  // root: Resolver;
  queries: Record<string, string>;
  mutations: Record<string, string>;
}

interface EntitySchema {
  metadata: EntityMetadata;
  name: string;
  query: string[];
  mutation: string[];
  model: string;
  inputs: string[];
  // search: string;
  // simple: string;
  // TODO: Remove
  // relations: Record<string, { target: string, type: string }>;
  // resolvers: Record<string, Resolver>;
}

interface ThriftToolkitResult {
  thrift: string;
  service: string;
  proxy: string;
  client: string;
  patch?: string;
  replace?: Record<string, RegExp>;
}

const ENTITY = '';
const GET = 'get';
const SEARCH = 'query';
const ARGS = '';
const CREATE = 'create';
const UPDATE = 'update';
const REMOVE = 'remove';

const GEN = 'gen';

const RESERVED = ['required', 'optional', 'service', 'enum', 'extends', 'exception', 'struct', 'throws', 'string', 'bool', 'list', 'set'];

function esc(name: string) {
  return RESERVED.includes(name) ? '__esc_' + name : name;
}

export interface ThriftToolkitOptions {
  name?: string;
  output?: string;
  service?: string | boolean;
  crud?: boolean;
}

export class ThriftToolkit {

  protected crud: boolean = false;

  public static async emit(opts: ThriftToolkitOptions = {}): Promise<ThriftToolkitResult> {
    const log = Debug('thrift', true);
    log.time('thrift', 'Generate Thrift IDL ...');
    opts.name = opts.name || 'App';
    const result = new ThriftToolkit(opts.crud).emit(opts.name || 'App');
    log.timeEnd('thrift', 'Thrift IDL generated.');
    if (!opts.output) return result;

    log.time('thrift', 'Generate Thrift service ...');
    const fs = require('fs');
    fs.writeFileSync(`${opts.output}/${opts.name.toLowerCase()}.thrift`, result.thrift);
    // fs.writeFileSync(`${opts.output}/${opts.name.toLowerCase()}.replace.json`, JSON.stringify(result.replace, null, 2));

    // tslint:disable-next-line:no-eval
    const gg: any = module || global || {};
    const karma = gg.require('@creditkarma/thrift-typescript');
    await karma.generate({
      rootDir: '.',
      sourceDir: opts.output,
      outDir: opts.output,
      target: 'thrift-server',
      files: [`${opts.name.toLowerCase()}.thrift`]
    });

    const files = fs.readdirSync(`${opts.output}/gen/`);
    for (const fn of files) {
      const path = `${opts.output}/gen/` + fn;
      log.debug('Patch:', fn);
      let code = fs.readFileSync(path).toString();
      for (const [sub, reg] of Object.entries(result.replace)) code = code.replace(reg, sub);
      fs.writeFileSync(path, code);
    }

    fs.writeFileSync(`${opts.output}/protocol.ts`, result.patch);
    fs.writeFileSync(`${opts.output}/proxy.ts`, result.proxy);
    fs.writeFileSync(`${opts.output}/client.ts`, result.client);
    if (typeof opts.service === 'string') {
      fs.writeFileSync(opts.service, result.service);
    } else if (opts.service !== false) {
      fs.writeFileSync(`${opts.output}/service.ts`, result.service);
    }

    log.timeEnd('thrift', 'Thrift service generated.');
    return result;
  }

  private constructor(crud?: boolean) { this.crud = !!crud; }

  public emit(name: string): ThriftToolkitResult {

    // tslint:disable:max-line-length

    const registry = Registry.copy();
    const dbs = Object.values(registry.DatabaseMetadata).sort((a, b) => a.name.localeCompare(b.name));
    const apis = Object.values(registry.ApiMetadata)
      .filter(a => !a.isCore())
      .sort((a, b) => a.name.localeCompare(b.name));
    const enums = Object.values(registry.EnumMetadata).sort((a, b) => a.name.localeCompare(b.name));

    let thrift = this.prolog() + '\n';
    let proxy = `import { Context, DocumentNode, gql } from 'tyx';\nimport * as gen from './protocol';\n`;

    const patch = this.genPatch();
    let proto = patch.patch;
    let replace = patch.replace;

    thrift += '///////// CORE /////////\n\n';
    proxy += '\n///////// CORE /////////\n\n';
    const core = this.genCore(CoreSchema.metadata);
    thrift += core.thrift;
    proxy += core.service;

    // const db = Object.values(this.schema.databases)[0];
    thrift += '/////// DATABASE //////\n\n';
    proxy += '\n/////// DATABASE //////\n\n';
    for (const type of dbs) {
      const res = this.genDatabase(type);
      thrift += res.thrift + '\n\n';
      proxy += res.service;
      replace = { ...replace, ...res.replace };
    }

    thrift += '///////// API /////////\n\n';
    proxy += '\n///////// API /////////\n';
    for (const api of apis) {
      const res = this.genApi(api);
      thrift += res.thrift + '\n\n';
      proxy += '\n' + res.service;
      replace = { ...replace, ...res.replace };
    }
    thrift += '///////// ENUM ////////\n\n';
    for (const type of enums) {
      const res = this.genEnum(type);
      thrift += res.thrift + '\n\n';
      proto += res.patch || '';
      replace = { ...replace, ...res.replace };
    }
    thrift += '//////// INPUTS ///////\n\n';
    for (const type of Object.values(registry.InputMetadata).sort((a, b) => a.name.localeCompare(b.name))) {
      const res = this.genStruct(type);
      thrift += res.thrift + '\n\n';
      proto += res.patch || '';
      replace = { ...replace, ...res.replace };
    }
    thrift += '//////// TYPES ////////\n\n';
    for (const type of Object.values(registry.TypeMetadata).sort((a, b) => a.name.localeCompare(b.name))) {
      const res = this.genStruct(type);
      thrift += res.thrift + '\n\n';
      proto += res.patch || '';
      replace = { ...replace, ...res.replace };
    }

    thrift += '//////// METADATA ////////\n\n';
    const schemas = Object.values(registry.CoreMetadata).sort((a, b) => a.name.localeCompare(b.name));
    for (const type of schemas) {
      if (type === CoreSchema.metadata) continue;
      const res = this.genStruct(type);
      thrift += res.thrift + '\n\n';
      proto += res.patch || '';
      replace = { ...replace, ...res.replace };
    }

    const service = this.genService(name, dbs, apis);
    const client = this.genClient(apis, name);

    return { thrift, service, proxy, client, patch: proto, replace };
  }

  private prolog(): string {
    return Utils.indent(`
      namespace java gen

      typedef string ID
      typedef string String
      typedef double Float
      typedef bool Boolean
      typedef i16 Small
      typedef i32 Int
      typedef i64 Long
      struct Timestamp {
        1: Long t
      }
      union Tson {
        1: bool u
        2: double n;
        3: bool b;
        4: string s;
        5: double t;
        6: string r;
        7: list<Tson> l;
        8: map<string, Tson> m;
      }
      // TODO: CoreException
    `).trimLeft();
  }

  private genEnum(meta: EnumMetadata): Partial<ThriftToolkitResult> {
    let thrift = `enum ${meta.name} {`;
    let i = 0;
    for (const key of meta.options) {
      thrift += `${i ? ',' : ''}\n  ${esc(key)} = ${i}`; i++;
    }
    thrift += '\n}';
    // const patch = `  {\n  // ${meta.name}\n  }\n`;
    return { thrift };
  }

  private genStruct(meta: TypeMetadata): Partial<ThriftToolkitResult> {
    let thrift = `struct ${meta.name} {`;
    let select = `struct ${meta.name}Selector {`;
    let filter = `struct ${meta.name}Filter {`;
    let enmap = '';
    let demap = '';
    const replace: any = {};
    let index = 0;
    let fix = 0;
    for (const field of Object.values(meta.members)) {
      const type = field.res;
      const opt = true; // GraphKind.isEntity(struc.kind) ? !field.required : true;
      thrift += `${index ? ',' : ''}\n  ${index + 1}: ${opt ? 'optional' : ''} ${type.idl} ${esc(field.name)}`;
      // TODO: build contains target type
      let st = 'Small';
      if (VarKind.isStruc(type.kind)) st = `${type.idl}Selector`;
      if (VarKind.isArray(type.kind) && !VarKind.isScalar(type.item.kind)) st = `${type.item.target.name}Selector`;
      select += `${index ? ',' : ''}\n  ${index + 1}: optional ${st} ${esc(field.name)}`;
      if (VarKind.isScalar(type.kind)) {
        filter += `${fix ? ',' : ''}\n  ${index + 1}: optional ${type.idl} ${esc(field.name)}`;
        fix++;
      }
      index++;
      if (VarKind.isEnum(type.kind)) {
        enmap += `\nif (obj && typeof obj.${field.name} === 'string') obj.${field.name} = ${GEN}.${type.idl}[obj.${field.name} as any];`;
        demap += `\nif (obj && typeof obj.${field.name} === 'number') obj.${field.name} = ${GEN}.${type.idl}[obj.${field.name}];`;
        replace[`output.writeI32(obj.${field.name} as number);`] = new RegExp(`output\\.writeI32\\(obj\\.${field.name}\\);`, 'g');
        replace[`: (__NAMESPACE__.${type.idl} | string)`] = new RegExp(`: __NAMESPACE__\\.${type.idl}`, 'g');
      }
      if (VarKind.isTson(type.kind)) {
        replace[`: (__NAMESPACE__.I${type.idl}Args | any)`] = new RegExp(`: __NAMESPACE__\\.I${type.idl}Args`, 'g');
        replace[`: (__NAMESPACE__.I${type.idl} | any)`] = new RegExp(`: __NAMESPACE__\\.I${type.idl}`, 'g');
      }
      if (VarKind.isTimestamp(type.kind)) {
        replace[`__NAMESPACE__.TimestampCodec.encode(obj.${field.name} as any`] = new RegExp(`__NAMESPACE__\\.TimestampCodec\\.encode\\(obj\\.${field.name}`);
        replace[`: (__NAMESPACE__.I${type.idl}Args | Date)`] = new RegExp(`: __NAMESPACE__\\.I${type.idl}Args`, 'g');
        replace[`: (__NAMESPACE__.I${type.idl} | Date)`] = new RegExp(`: __NAMESPACE__\\.I${type.idl}`, 'g');
      }
    }
    thrift += `\n} (kind = "${meta.kind}")\n\n`;
    select += `\n} (kind = "Selector")\n\n`;
    filter += `\n} (kind = "Filter")`;
    thrift += select;
    thrift += filter;
    const patch = (enmap.trim() || demap.trim()) ? Utils.indent(`
    {
      const codec = { ...${GEN}.${meta.name}Codec };
      ${GEN}.${meta.name}Codec.encode = (obj: ${GEN}.I${meta.name}Args, output: thrift.TProtocol) => {
        ${Utils.indent(enmap.trim(), 8).trimLeft() || '// NOP'}
        codec.encode(obj, output);
      }
      ${GEN}.${meta.name}Codec.decode = (input: thrift.TProtocol): ${GEN}.I${meta.name} => {
        const obj = codec.decode(input);
        ${Utils.indent(demap.trim(), 8).trimLeft() || '// NOP'}
        return obj;
      }
    }\n`) : '';
    return { thrift, patch, replace };
  }

  // TODO: Patch Tson, Timestamp constructors !!!!
  private genPatch(): Partial<ThriftToolkitResult> {
    const patch = Utils.indent(`
      import * as thrift from "@creditkarma/thrift-server-core";
      import * as ${GEN} from './gen';
      export * from './gen';

      /// Patch to support Date
      {
        const codec = { ...${GEN}.TimestampCodec };
        ${GEN}.TimestampCodec.encode = (args: ${GEN}.ITimestampArgs | Date, output: thrift.TProtocol) => {
          if (args instanceof Date) args = { t: args.getTime() };
          codec.encode(args, output);
        };
        ${GEN}.TimestampCodec.decode = (input: thrift.TProtocol): ${GEN}.ITimestamp | Date | any => {
          const val = codec.decode(input);
          if (!val || val.t === void 0) return val;
          const obj: any = new Date(+val.t.toString());
          obj.t = val.t;
          return obj;
        };
      }
      /// Patch to support Json econding as Tson
      {
        const codec = { ...${GEN}.TsonCodec };
        ${GEN}.TsonCodec.encode = (args: ${GEN}.ITsonArgs, output: thrift.TProtocol) => {
          codec.encode(marshal(args), output);
        };
        ${GEN}.TsonCodec.decode = (input: thrift.TProtocol): ${GEN}.ITson | any => {
          return unmarshal(codec.decode(input));
        };
        ${Utils.indent(Tson.code(GEN), 8).trim()}
        (${GEN}.TsonCodec as any).marshal = marshal;
        (${GEN}.TsonCodec as any).unmarshal = unmarshal;
      }
    `);

    const replace: Record<string, RegExp> = {};

    replace[`constructor(argz?: ITsonArgs | any) {
        super();
        const args = (TsonCodec as any).marshal ?  (TsonCodec as any).marshal(argz) : argz || {};`]
      = new RegExp(`constructor\\(args: ITsonArgs = \\{\\}\\) {\n        super\\(\\);`);

    replace[`constructor(argz?: ITimestampArgs | Date) {
        super();
        const args = argz instanceof Date ? { t: argz.getTime() } : argz || {};`]
      = new RegExp(`constructor\\(args: ITimestampArgs = \\{\\}\\) {\n        super\\(\\);`);

    replace[`__NAMESPACE__.TimestampCodec.encode(<any> `] = new RegExp('__NAMESPACE__\\.TimestampCodec\\.encode\\(', 'g');

    return { patch, replace };
  }

  private genService(name: string, dbs: DatabaseMetadata[], apis: ApiMetadata[]): string {
    let script = `
      import { CoreThrift, Service } from 'tyx';
      import * as ${GEN} from '../thrift/proxy';

      @Service(true)
      export class ${name}ThriftService extends CoreThrift {
        public constructor() {
          super({
            [${GEN}.CoreProxy.PATH]: ${GEN}.CoreProxy.processor()`;

    for (const db of dbs) {
      script += `,\n            [${GEN}.${db.name}Proxy.PATH]: ${GEN}.${db.name}Proxy.processor()`;
    }
    for (const api of apis) {
      script += `,\n            [${GEN}.${api.name}Proxy.PATH]: ${GEN}.${api.name}Proxy.processor()`;
    }
    script += `
          });
        }
        // @Override()
      }
    `;
    return Utils.indent(script).trimLeft();
  }

  private genApi(api: ApiMetadata): Partial<ThriftToolkitResult> {
    const kebab = Utils.kebapCase(api.name);
    let thrift = `service ${api.name} {`;
    let query = `// --- GQL ---\n`;
    let script = `export class ${api.name}Proxy implements ${GEN}.${api.name}.IHandler<Context> {\n`;
    script += `  public static readonly PATH = '${kebab}';\n`;
    script += `  public static processor() { return new ${GEN}.${api.name}.Processor(new ${api.name}Proxy()); }\n`;
    script += `  constructor (protected ctx?: Context) { }\n`;

    let count = 0;
    for (const method of Object.values(api.methods)) {
      if (!method.query && !method.mutation) continue;

      const result = method.result.res;
      let idlArgs = '';
      let jsArgs = '';
      let reqArgs = '';
      let qlArgs = '';
      let params = '';
      for (let i = 0; i < method.args.length; i++) {
        const inb = method.args[i].res;
        if (VarKind.isVoid(inb.kind) || VarKind.isResolver(inb.kind)) continue;
        const param = method.args[i].name;
        if (idlArgs) { idlArgs += ', '; jsArgs += ', '; reqArgs += ', '; qlArgs += ', '; params += ', '; }
        params += param;
        idlArgs += `${i + 1}: ${inb.idl} ${esc(param)}`;
        jsArgs += `${param}: ${VarKind.isScalar(inb.kind) ? '' : `${GEN}.I`}${inb.js}`;
        reqArgs += `$${param}: ${inb.gql}!`;
        qlArgs += `${param}: $${param}`;
      }
      if (reqArgs) reqArgs = `(${reqArgs})`;
      if (qlArgs) qlArgs = `(${qlArgs})`;
      if (jsArgs) jsArgs += ', ';
      jsArgs += 'ctx?: Context';

      if (count) thrift += ',';
      // if (method.mutation) {
      thrift += `\n  ${result.idl} ${esc(method.name)}(${idlArgs})`;
      // } else {
      //   script += `\n  ${result.idl} ${method.name}(${idlArgs}${idlArgs ? ', ' : ''}refresh: bool)`;
      // }

      const gql = Utils.snakeCase(method.name, true) + '_GQL';
      query += `public static readonly ${gql}: DocumentNode = gql\`\n`;
      if (method.mutation) {
        query += `  mutation request${reqArgs} {\n`;
      } else {
        query += `  query request${reqArgs} {\n`;
      }
      query += `    result: ${method.api.name}_${method.name}${qlArgs} `;
      if (VarKind.isStruc(result.kind) || VarKind.isArray(result.kind)) {
        const select = TypeSelect.emit(result, method.select);
        query += Utils.indent(select, '  '.repeat(2)).trimLeft();
      } else {
        query += `# : ${result.kind}`;
      }
      if (qlArgs) query += `\n    # variables: { ${params} }`;
      query += `\n}\`;\n`;
      // if (method.query) {
      //   query += `,\n    // fetchPolicy: NO_CACHE ? 'no-cache' : refresh ? 'network-only' : 'cache-first'`;
      // }
      // query += `\n};\n\n`;

      script += `  public async ${esc(method.name)}(${jsArgs}) {\n`;
      // `: Promise<${VarKind.isScalar(result.kind) ? '' : `${GEN}.`}${result.js}> {\n`;
      script += `    const res = await (ctx || this.ctx).execute(${api.name}Proxy.${gql}, { ${params} });\n`;
      script += `    return res;\n`;
      script += `  }\n`;

      count++;
    }
    thrift += `\n} (path="${kebab}", target = "${api.servicer && api.servicer.name}")`;
    script += Utils.indent(query, 2);
    script += '}\n';
    return { thrift, service: script };
  }

  private genDatabase(db: DatabaseMetadata): Partial<ThriftToolkitResult> {
    const schema: DatabaseSchema = {
      metadata: db,
      name: db.name,
      alias: db.alias,
      entities: {},
      queries: {},
      mutations: {}
    };

    for (const entity of db.entities) this.genEntity(schema, entity);

    let thrift = `# -- Database: ${db.name} --\n`;
    thrift += `service ${schema.metadata.target.name} {\n`;
    for (const entity of Object.values(schema.entities)) {
      thrift += `  // -- ${entity.name}\n`;
      if (entity.query) entity.query.forEach(line => thrift += `  ` + line);
      if (entity.mutation) entity.mutation.forEach(line => thrift += `  ` + line);
    }
    thrift += `} (kind="Database")\n`;
    for (const entity of Object.values(schema.entities)) {
      thrift += `\n# -- Entity: ${entity.name} --\n`;
      thrift += entity.model;
      thrift += "\n";
    }
    for (const entity of Object.values(schema.entities)) {
      thrift += `\n# -- Entity: ${entity.name} --\n`;
      thrift += entity.inputs.join('\n');
      thrift += "\n";
    }

    const kebab = Utils.kebapCase(db.name);

    let script = `export class ${db.name}Proxy implements ${GEN}.${db.name}.IHandler<Context> {\n`;
    script += `  public static readonly PATH = '${kebab}';\n`;
    script += `  public static processor() { return new ${GEN}.${db.name}.Processor(new ${db.name}Proxy()); }\n`;
    script += `  constructor (protected ctx?: Context) { }\n`;

    for (let [name, body] of Object.entries(schema.queries)) {
      body = Utils.indent(body, '  ').trimLeft();
      script += `  public ${name}${body}\n`;
    }
    for (let [name, body] of Object.entries(schema.mutations)) {
      body = Utils.indent(body, '  ').trimLeft();
      script += `  public ${name}${body}\n`;
    }

    script += '}\n';

    return { thrift, service: script };
  }

  private genEntity(db: DatabaseSchema, entity: EntityMetadata): EntitySchema {
    const name = entity.name;
    if (db.entities[name]) return db.entities[name];

    let model = `struct ${name}${ENTITY} {`;
    let partial = `PartialExpr {`;
    let nil = `NullExpr {`;
    let multi = `MultiExpr {`;
    let like = `LikeExpr {`;
    let order = `OrderExpr {`;
    let create = `CreateRecord {`;
    let update = `UpdateRecord {`;
    let select = `Selector {`;
    let keys = '';
    let keyJs = '';
    let keyNames = '';
    let keyIx = 0;
    let index = 0;
    let cm = true;
    for (const col of entity.columns) {
      if (col.isTransient) continue;
      index++;
      const pn = col.propertyName;
      let dt = col.res.idl;
      let nl = col.mandatory ? 'required' : 'optional';
      if (pn.endsWith('Id')) dt = VarKind.ID;
      model += `${cm ? '' : ','}\n  ${index}: ${nl} ${dt} ${pn}`;
      if (col.isPrimary) {
        keys += `${cm ? '' : ', '}${++keyIx}: ${nl} ${dt} ${pn}`;
        keyJs += `${cm ? '' : ', '}${pn}: ${col.res.js}`;
        keyNames += `${cm ? '' : ', '}${pn}`;
      }
      partial += `${cm ? '' : ','}\n  ${index}: optional ${dt} ${pn}`;
      nil += `${cm ? '' : ','}\n  ${index}: optional bool ${pn}`;
      multi += `${cm ? '' : ','}\n  ${index}: optional list<${dt}> ${pn}`;
      like += `${cm ? '' : ','}\n  ${index}: optional string ${pn}`;
      order += `${cm ? '' : ','}\n  ${index}: optional i16 ${pn}`;
      update += `${cm ? '' : ','}\n  ${index}: ${col.isPrimary ? 'required' : 'optional'} ${dt} ${pn}`;

      const type = col.res;
      let st = 'i16';
      if (VarKind.isStruc(type.kind)) st = `${type.idl}Selector`;
      if (VarKind.isArray(type.kind) && !VarKind.isScalar(type.item.kind)) st = `${type.idl.substring(5, type.idl.length - 1)}Selector`;
      select += `${cm ? '' : ','}\n  ${index}: optional ${st} ${esc(col.name)}`;

      if (col.isCreateDate || col.isUpdateDate || col.isVersion || col.isVirtual || col.isGenerated) nl = 'optional';
      create += `${cm ? '' : ','}\n  ${index}: ${nl} ${dt} ${pn}`;
      cm = false;
    }
    // Debug field
    // model += `,\n  _exclude: Boolean`;
    // model += `,\n  _debug: _DebugInfo`;
    let qix = 0;
    const opers = [
      `${++qix}: optional ${ARGS}${name}PartialExpr if`,
      `${++qix}: optional ${ARGS}${name}PartialExpr eq`,
      `${++qix}: optional ${ARGS}${name}PartialExpr ne`,
      `${++qix}: optional ${ARGS}${name}PartialExpr gt`,
      `${++qix}: optional ${ARGS}${name}PartialExpr gte`,
      `${++qix}: optional ${ARGS}${name}PartialExpr lt`,
      `${++qix}: optional ${ARGS}${name}PartialExpr lte`,
      `${++qix}: optional ${ARGS}${name}LikeExpr like`,
      `${++qix}: optional ${ARGS}${name}LikeExpr nlike`,
      `${++qix}: optional ${ARGS}${name}LikeExpr rlike`,
      `${++qix}: optional ${ARGS}${name}MultiExpr in`,
      `${++qix}: optional ${ARGS}${name}MultiExpr nin`,
      `${++qix}: optional ${ARGS}${name}NullExpr nil`, // TODO
      `${++qix}: optional ${ARGS}${name}WhereExpr not`,
      `${++qix}: optional ${ARGS}${name}WhereExpr nor`,
      `${++qix}: optional list<${ARGS}${name}WhereExpr> and`,
      `${++qix}: optional list<${ARGS}${name}WhereExpr> or`,
    ];

    const where = `WhereExpr {\n  `
      + opers.join(',\n  ');

    const queryExpr = 'QueryExpr {'
      + `\n  `
      + opers.join(',\n  ') + `,`
      + `\n  ${++qix}: optional ${ARGS}${name}OrderExpr order,`
      + `\n  ${++qix}: optional i32 skip,`
      + `\n  ${++qix}: optional i32 take,`
      + `\n  ${++qix}: optional bool exists`;

    const temp = [queryExpr, where, partial, nil, multi, like, order, select];
    if (this.crud) {
      temp.push(create);
      temp.push(update);
    }
    const inputs = temp.map(x => `struct ${ARGS}${name}${x}\n} (kind = "Expression")\n`);

    const queryInput = `1: optional ${ARGS}${name}QueryExpr query`;
    const query = [
      `${name}${ENTITY} ${GET}${name}(${keys}); // @crud(auth: {})\n`,
      `list<${name}${ENTITY}> ${SEARCH}${name}(${queryInput});  // @crud(auth: {})\n`
    ];

    const mutation = [
      `${name}${ENTITY} ${CREATE}${name}(1: required ${ARGS}${name}CreateRecord record); // @crud(auth: {}),\n`,
      `${name}${ENTITY} ${UPDATE}${name}(1: required ${ARGS}${name}UpdateRecord record); // @crud(auth: {}),\n`,
      `${name}${ENTITY} ${REMOVE}${name}(${keys}); // @crud(auth: {})\n`,
    ];

    const schema: EntitySchema = {
      metadata: entity,
      name: entity.name,

      query,
      mutation: this.crud ? mutation : undefined,
      model,
      inputs,
      // search
    };
    const id = `'${db.name}.${entity.name}'`;
    db.queries = {
      ...db.queries,
      [`${GET}${name}`]: `
      (${keyJs}, ctx?: Context): Promise<${GEN}.${entity.name}> {
        return (ctx || this.ctx).provider.get(${id}, null, { ${keyNames} }, ctx);
      }`,
      [`${SEARCH}${name}`]: `
      (query: ${GEN}.${ARGS}${name}QueryExpr, ctx?: Context): Promise<${GEN}.${entity.name}[]> {
        return (ctx || this.ctx).provider.search(${id}, null, { query }, ctx);
      }`,
    };
    db.mutations = this.crud ? {
      ...db.mutations,
      [`${CREATE}${name}`]: `
      (record: ${GEN}.${ARGS}${name}CreateRecord, ctx?: Context): Promise<${GEN}.${name}${ENTITY}> {
        return (ctx || this.ctx).provider.create(${id}, null, record, ctx);
      }`,
      [`${UPDATE}${name}`]: `
      (record: ${GEN}.${ARGS}${name}UpdateRecord, ctx?: Context): Promise<${GEN}.${name}${ENTITY}> {
        return (ctx || this.ctx).provider.update(${id}, null, record, ctx);
      }`,
      [`${REMOVE}${name}`]: `
      (${keyJs}, ctx?: Context): Promise<${GEN}.${name}${ENTITY}> {
        return (ctx || this.ctx).provider.remove(${id}, null, { ${keyNames} }, ctx);
      }`,
    } : db.mutations;
    db.entities[name] = schema;

    for (const relation of entity.relations) {
      const property = relation.propertyName;
      const inverse = relation.inverseEntityMetadata.name;
      const rm = /* schema.relations[property] = */ { inverse } as any;
      // TODO: Subset of entities
      // if (!entities.find(e => e.name === target)) continue;
      if (relation.relationType === RelationType.ManyToOne) {
        rm.type = 'manyToOne';
        const args = '';
        model += `,\n  ${++index}: optional ${inverse}${ENTITY} ${property}${args} (relation = "ManyToOne")`;
        // simple += `,\n  ${property}: ${inverse}${ENTITY}`;
      } else if (relation.relationType === RelationType.OneToOne) {
        rm.type = 'oneToOne';
        const args = '';
        model += `,\n  ${++index}: optional ${inverse}${ENTITY} ${property}${args} (relation = "OneToOne")`;
      } else if (relation.relationType === RelationType.OneToMany) {
        rm.type = 'oneToMany';
        // const temp = this.genEntity(db, relation.inverseEntityMetadata);
        const args = ''; // ` (${temp.search}\n  )`;
        model += `,\n  ${++index}: optional list<${inverse}${ENTITY}> ${property}${args} (relation = "OneToMany")`;
      } else if (relation.relationType === RelationType.ManyToMany) {
        rm.type = 'manyToMany';
        // const temp = this.genEntity(db, relation.inverseEntityMetadata);
        const args = ''; //  ` (${temp.search}\n  )`;
        model += `,\n  ${++index}: optional list<${inverse}${ENTITY}> ${property}${args} (relation = "ManyToMany")`;
      }
    }
    for (const col of entity.columns) {
      if (!col.isTransient) continue;
      const pn = col.propertyName;
      // const nl = col.required ? '!' : '';
      model += `${cm ? '' : ','}\n  ${++index}: optional ${col.res.idl} ${pn} (transient)`;
    }
    model += `\n} (kind="Entity")`;

    schema.model = model;
    // schema.schema = query + "\n" + mutation + "\n" + model + "\n" + inputs.join("\n");

    return schema;
  }

  public genCore(core: TypeMetadata): Partial<ThriftToolkitResult> {
    const name = 'Core';

    let queries = '';

    let thrift = `service ${name} {\n`;
    const kebab = Utils.kebapCase(name);

    let query = `// --- GQL ---\n`;
    let script = `export class ${name}Proxy implements ${GEN}.${name}.IHandler<Context> {\n`;
    script += `  public static readonly PATH = '${kebab}';\n`;
    script += `  public static processor() { return new ${GEN}.${name}.Processor(new ${name}Proxy()); }\n`;
    script += `  constructor (protected ctx?: Context) { }\n`;

    let ix = 0;
    for (const reg of Object.values(core.members)) {
      const type = reg.res;
      const target = VarKind.isArray(type.kind)
        ? reg.res.item.target as TypeMetadata
        : reg.res.target as TypeMetadata;

      thrift += `${ix ? ',\n' : ''}  ${reg.res.idl} get${reg.name}(\n`;
      thrift += `    1: optional ${reg.name}Query query,\n`;
      thrift += `  )`;

      queries += `struct ${reg.name}Query {\n`;
      if (VarKind.isArray(type.kind)) {
        queries += `    1: optional ${target.name}Filter eq,\n`;
        queries += `    2: optional ${target.name}Filter like,\n`;
      }
      queries += `    3: optional ${target.name}Selector selector\n`;
      queries += '} (kind = "Query")\n';

      const gql = Utils.snakeCase(reg.name, true) + '_GQL';

      let params = '';
      if (VarKind.isArray(type.kind)) {
        for (const field of Object.values(target.members)) {
          const inb = field.res;
          if (!VarKind.isScalar(inb.kind)) continue;
          const param = field.name;
          if (params) params += ', ';
          params += param;
        }
      }
      let reqArgs = '';
      let qlArgs = '';
      if (params) {
        reqArgs = `($eq: ${target.name}Filter, $like: ${target.name}Filter)`;
        qlArgs = `(eq: $eq, like: $like)`;
      }

      query += `public static readonly ${gql}: DocumentNode = gql\`\n`;
      query += `  query request${reqArgs} {\n`;
      query += `    result: ${name} {\n`;
      query += `      select: ${reg.name}${qlArgs} `;
      if (VarKind.isStruc(type.kind) || VarKind.isArray(type.kind)) {
        const select = TypeSelect.emit(type, 2);
        query += Utils.indent(select, 3 * 2).trimLeft();
      } else {
        query += `# : ${type.kind}`;
      }
      // if (qlArgs)
      query += `\n    }`;
      query += `\n    # variables: { ${params} }`;
      query += `\n  }\n\`;\n`;

      script += `  public async get${esc(reg.name)}(query: ${GEN}.${reg.name}Query, ctx?: Context) {\n`;
      script += `    // if (query.select) ...\n`;
      script += `    const res = await (ctx || this.ctx).execute(${name}Proxy.${gql}, ${params ? 'query' : '{}'});\n`;
      script += `    return res.select;\n`;
      script += `  }\n`;

      ix++;
    }

    thrift = queries + '\n' + thrift + `\n} (path="${kebab}")\n\n`;
    script += Utils.indent(query, 2);
    script += '\n}\n';

    return { thrift, service: script };
  }

  private genClient(apis: ApiMetadata[], name: string) {
    let vars = `      private varCore: ${GEN}.Core.Client;\n`;
    let gets = `      public get Core() { this.renew(); return this.varCore; }\n`;
    let sets = `        this.varCore = this.client(${GEN}.Core.Client);\n`;
    for (const api of apis) {
      vars += `      private var${api.name}: ${GEN}.${api.name}.Client;\n`;
      gets += `      public get ${api.name}() { this.renew(); return this.var${api.name}; }\n`;
      sets += `        this.var${api.name} = this.client(${GEN}.${api.name}.Client);\n`;
    }
    const script = `
    import { createHttpClient, ICreateHttpClientOptions } from '@creditkarma/thrift-client';
    import { IClientConstructor, ThriftClient } from '@creditkarma/thrift-server-core';
    import * as ${GEN} from './protocol';

    export interface ${name}ThriftClientOptions extends ICreateHttpClientOptions {
      hostName: string;
      port: number;
      path: string;
      https: boolean;
      token?: string;
    }

    export class ${name}ThriftClient {
      public options: ${name}ThriftClientOptions;
      public renewal: number;

      ${vars.trim()}

      ${gets.trim()}

      constructor(options: ${name}ThriftClientOptions) {
        this.options = {
          ...options,
          requestOptions: {
            headers: {
              Accept: 'application/octet-stream',
              Authorization: options.token
            }
          }
        };
        this.renew();
      }

      private renew() {
        if (this.renewal > Date.now()) return;
        ${sets.trim()}
        this.renewal = Date.now() + 20 * 60 * 1000;
      }

      private client<T extends ThriftClient<C>, C = any>(type: IClientConstructor<T, C>) {
        const options = { ...this.options, requestOptions: { headers: { ...this.options.requestOptions.headers } } };
        options.path += type.annotations['path'] || type.serviceName || type.name;
        // options.requestOptions.headers.Authorization = 'TODO-GET-FUNCTION';
        return createHttpClient(type, options);
      }
    }
    `;
    return Utils.indent(script);
  }
}
