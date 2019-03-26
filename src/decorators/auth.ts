import { MethodMetadata } from '../metadata/method';
import { CoreDecorator } from '../metadata/registry';
import { Roles } from '../types/security';

// tslint:disable:function-name

export function Public() {
  return AuthDecorator(Public, { Public: true, Internal: true, External: true, Remote: true });
}

export function Local() {
  return AuthDecorator(Local, { Local: true, Internal: true, External: false, Remote: true });
}

export function Private() {
  return AuthDecorator(Private, { Internal: false, Remote: false, External: false });
}

export function Internal() {
  return AuthDecorator(Internal, { Internal: true, External: false, Remote: false });
}

export function External() {
  return AuthDecorator(External, { Internal: true, External: true, Remote: true });
}

export function Remote() {
  return AuthDecorator(Remote, { Internal: true, External: false, Remote: true });
}

export function Auth<TR extends Roles>(roles: TR) {
  return AuthDecorator(Auth, roles);
}

function AuthDecorator(decorator: Function, roles: Roles): MethodDecorator {
  return CoreDecorator.onMethod(decorator, { roles }, (target, propertyKey, descriptor) => {
    const auth = decorator.name.toLowerCase();
    MethodMetadata.define(target, propertyKey as string, descriptor).addAuth(auth, roles);
  });
}
