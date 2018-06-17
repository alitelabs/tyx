import FS = require('fs');
// tslint:disable-next-line:import-blacklist
import { Core, CoreSchema, Enum, Field, Input, Mutation, Query, Service, Type } from '..';
import { Public } from '../decorators/auth';

@Input()
export class TestInput {
  @Field(String) data: string;
  @Field(Boolean) urgent: boolean;
}

@Type()
export class TypeA {
  @Field(String) name: string;
}

export enum OnOff {
  On = 'On',
  Off = 'Off',
}
Enum(OnOff, 'OnOff');

@Type()
export class TestResult {
  @Field(String) res: string;
  @Field([String]) versions: string[];
  @Field(Boolean) bool?: boolean;
  @Field(Enum(OnOff)) state?: OnOff;
  @Field(ref => TypeA) sub?: TypeA;
  @Field(list => [TypeA]) subs?: TypeA[];
  @Field(ref => String) str?: string;
  @Field(ref => [String]) strs?: string[];
}

@Service()
export class HelloWorld {

  @Public()
  @Query(req => TestInput, res => TestResult)
  public test(req: TestInput): TestResult {
    return { res: 'world', versions: Object.entries(process.versions).map(p => p[0] + '=' + p[1]) };
  }

  @Public()
  @Mutation(req => TestInput, res => TestResult)
  public operation(req: TestInput): TestResult {
    return { res: JSON.stringify(req), versions: ['1', '2', '3'] };
  }

  @Public()
  @Query(req => String, res => [String])
  public testLiteral(req: string): string[] {
    return [req];
  }

  @Public()
  @Query([undefined], res => [String])
  public testVoid(): string[] {
    return [undefined];
  }

  @Public()
  @Query(state => Enum(OnOff), res => String)
  public testEnum(state: OnOff): string {
    return state;
  }
}

const schema = new CoreSchema();
FS.writeFileSync('schema.gql', schema.typeDefs());
schema.executable();

Core.start(5055);
