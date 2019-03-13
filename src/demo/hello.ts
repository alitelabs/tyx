// tslint:disable-next-line:import-blacklist
import { Mutation, Public, Query, Service } from '..';
import { CoreServer } from '../core/server';
import { Any } from '../metadata/type';

@Service()
export class HelloWorld {

  @Public() @Query(Any, Any)
  public test(req: any) {
    return { hello: 'world', req };
  }

  @Public() @Mutation(Any, Any)
  public operation(req: any) {
    return req;
  }
}

CoreServer.start(5055);
