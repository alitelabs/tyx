import FS = require('fs');
// tslint:disable-next-line:import-blacklist
import { Core, Enum, Field, Input, Mutation, Query, Service, Type } from '..';
import { CoreServer } from '../core/server';
import { Public } from '../decorators/auth';
import { Any } from '../metadata/var';

@Type()
export class TypeA {
  @Field() name: string;
}

@Type()
export class JavaScript {
  @Field() aString: string;
  @Field() aNumber: number;
  @Field() aBoolean: boolean;
  @Field() aObject: Boolean;
  @Field() anEnum: OnOff;
  @Field(Number) aConst = 23;
  @Field() aDate: Date;
  @Field(Any) anAny: any;
  @Field([void 0]) aVoid: void;
  @Field(Object) aNull: null;
  @Field(Object) aNever: never;
  @Field([String]) aStringArray: string[];
  @Field([Number]) aNumArray: number[];
  @Field(ref => TypeA) aType: TypeA;
}

@Input()
export class TestInput {
  @Field() data: string;
  @Field() urgent: boolean;
}

export enum OnOff {
  On = 'On',
  Off = 'Off',
}
Enum(OnOff, 'OnOff');

@Type()
export class TestResult {
  @Field() res: string;
  @Field([String]) versions: string[];
  @Field() bool?: boolean;
  @Field(Enum(OnOff)) state?: OnOff;
  @Field(ref => TypeA) sub?: TypeA;
  @Field(list => [TypeA]) subs?: TypeA[];
  @Field(ref => String) str?: string;
  @Field(ref => [String]) strs?: string[];
}

@Service()
export class HelloWorld {

  @Public()
  @Query([req => TestInput, b => String], res => TestResult)
  public test(req: TestInput): TestResult {
    return { res: 'world', versions: Object.entries(process.versions).map(p => p[0] + '=' + p[1]) };
  }

  @Public()
  @Mutation([req => TestInput], res => TestResult)
  public operation(req: TestInput): TestResult {
    return { res: JSON.stringify(req), versions: ['1', '2', '3'] };
  }

  @Public()
  @Query(res => [String])
  public testLiteral(req: string): string[] {
    return [req];
  }

  @Public()
  @Query([], res => [String])
  public testVoid(): string[] {
    return [undefined];
  }

  @Public()
  @Query([state => Enum(OnOff)], res => String)
  public testEnum(state: OnOff): string {
    return state;
  }
}

FS.writeFileSync('schema.gql', Core.schema.typeDefs());

CoreServer.start(5055);
