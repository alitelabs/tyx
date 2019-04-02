import { ApiMetadata } from '../metadata/api';
import { EnumMetadata } from '../metadata/enum';
import { Registry } from '../metadata/registry';
import { TypeMetadata, TypeSelect } from '../metadata/type';
import { VarKind } from '../metadata/var';
import { Utils } from '../utils';

export class AngularTools {

  public static emit(): string {
    return new AngularTools().emit();
  }

  private constructor() { }

  public emit(): string {
    let script = this.prolog() + '\n';

    const registry = Registry.copy();
    script += '///////// API /////////\n';
    for (const api of Object.values(registry.ApiMetadata).sort((a, b) => a.name.localeCompare(b.name))) {
      const code = this.genApi(api);
      if (code) script += code + '\n\n';
    }
    script += '///////// ENUM ////////\n';
    for (const type of Object.values(registry.EnumMetadata).sort((a, b) => a.name.localeCompare(b.name))) {
      script += this.genEnum(type) + '\n\n';
    }
    // const db = Object.values(this.schema.databases)[0];
    script += '/////// ENTITIES //////\n';
    for (const type of Object.values(registry.EntityMetadata).sort((a, b) => a.name.localeCompare(b.name))) {
      script += this.genInterface(type) + '\n\n';
    }
    script += '//////// INPUTS ///////\n';
    for (const type of Object.values(registry.InputMetadata).sort((a, b) => a.name.localeCompare(b.name))) {
      script += this.genInterface(type) + '\n\n';
    }
    script += '//////// TYPES ////////\n';
    for (const type of Object.values(registry.TypeMetadata).sort((a, b) => a.name.localeCompare(b.name))) {
      script += this.genInterface(type) + '\n\n';
    }
    return script;
  }

  private prolog(): string {
    return Utils.indent(`
      import { Injectable } from '@angular/core';
      import { Apollo } from 'apollo-angular';
      import { ApolloQueryResult } from 'apollo-client';
      import { FetchResult } from 'apollo-link';
      import gql from 'graphql-tag';
      import { Observable } from 'rxjs';
      import { catchError, map } from 'rxjs/operators';

      const NO_CACHE = true;

      export interface ApiError {
        code: number;
        message: string;
      }

      interface Result<T> { result: T; }

      function result<T>(res: ApolloQueryResult<Result<T>>): T {
        return res.data.result;
      }

      function fetch<T>(res: FetchResult<Result<T>>): T {
        return res.data.result;
      }

      function erorr(err: any): never {
        err = err.networkError ? (err.networkError.error || err.networkError) : err;
        err.code = err.code || err.status;
        throw err;
      }
    `).trimLeft();
  }

  private genEnum(metadata: EnumMetadata): string {
    let script = `export enum ${metadata.name} {`;
    let i = 0;
    for (const key of metadata.options) {
      script += `${i ? ',' : ''}\n  ${key} = '${key}'`;
      i++;
    }
    script += '\n}';
    return script;
  }

  private genInterface(struc: TypeMetadata): string {
    let script = `export interface ${struc.name} {`;
    for (const field of Object.values(struc.members)) {
      const type = field.res;
      const opt = true; // GraphKind.isEntity(struc.kind) ? !field.required : true;
      script += `\n  ${field.name}${opt ? '?' : ''}: ${type.js};`;
    }
    script += '\n}';
    return script;
  }

  private genApi(metadata: ApiMetadata): string {
    let script = `@Injectable()\nexport class ${metadata.name} {\n`;
    script += `  constructor(private graphql: Apollo) { }\n`;
    let count = 0;
    for (const method of Object.values(metadata.methods)) {
      if (!method.query && !method.mutation) continue;
      count++;
      const result = method.result.res;
      const action = method.mutation ? 'mutate' : 'query';
      let jsArgs = '';
      let reqArgs = '';
      let qlArgs = '';
      let params = '';
      for (let i = 0; i < method.args.length; i++) {
        const inb = method.args[i].res;
        if (VarKind.isVoid(inb.kind) || VarKind.isResolver(inb.kind)) continue;
        const param = method.args[i].name;
        if (jsArgs) { jsArgs += ', '; reqArgs += ', '; qlArgs += ', '; params += ', '; }
        params += param;
        jsArgs += `${param}: ${inb.js}`;
        reqArgs += `$${param}: ${inb.gql}!`;
        qlArgs += `${param}: $${param}`;
      }
      if (reqArgs) reqArgs = `(${reqArgs})`;
      if (qlArgs) qlArgs = `(${qlArgs})`;

      if (method.mutation) {
        script += `\n  public ${method.name}(${jsArgs}): Observable<${result.js}> {\n`;
      } else {
        script += `\n  public ${method.name}(${jsArgs}${jsArgs ? ', ' : ''}refresh?: boolean): Observable<${result.js}> {\n`;
      }
      script += `    return this.graphql.${action}<Result<${result.js}>>({\n`;
      if (method.mutation) {
        script += `      mutation: gql\`mutation request${reqArgs} {\n`;
      } else {
        script += `      query: gql\`query request${reqArgs} {\n`;
      }
      script += `        result: ${method.api.name}_${method.name}${qlArgs}`;
      if (VarKind.isStruc(result.kind) || VarKind.isArray(result.kind)) {
        const select = TypeSelect.emit(result, method.select);
        script += ' ' + Utils.indent(select, 4 * 2).trimLeft();
      } else {
        script += ` # : ANY`;
      }
      script += `\n      }\``;
      if (qlArgs) script += `,\n      variables: { ${params} }`;
      if (method.mutation) {
        script += `\n    }).pipe(map(res => fetch(res)), catchError(err => erorr(err)));\n`;
      } else {
        script += `,\n      fetchPolicy: NO_CACHE ? 'no-cache' : refresh ? 'network-only' : 'cache-first'\n`;
        script += `    }).pipe(map(res => result(res)), catchError(err => erorr(err)));\n`;
      }
      script += `  }\n`;
    }
    script += '}';
    return count ? script : '';
  }
}
