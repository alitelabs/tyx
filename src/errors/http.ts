import { Exception } from '../decorators/exception';
import { ApiError } from './common';

@Exception
export class BadRequest extends ApiError {
  constructor(message?: string, cause?: any) {
    super(400, message, cause);
  }
}

@Exception
export class Unauthorized extends ApiError {
  constructor(message?: string, cause?: any) {
    super(401, message, cause);
  }
}

@Exception
export class Forbidden extends ApiError {
  constructor(message?: string, cause?: any) {
    super(403, message, cause);
  }
}

@Exception
export class NotFound extends ApiError {
  constructor(message?: string, cause?: any) {
    super(404, message, cause);
  }
}

@Exception
export class MethodNotAllowed extends ApiError {
  constructor(message?: string, cause?: any) {
    super(405, message, cause);
  }
}

@Exception
export class Conflict extends ApiError {
  constructor(message?: string, cause?: any) {
    super(409, message, cause);
  }
}

@Exception
export class InternalServerError extends ApiError {
  constructor(message?: string, cause?: any) {
    super(500, message, cause);
  }
}

@Exception
export class NotImplemented extends ApiError {
  constructor(message?: string, cause?: any) {
    super(501, message, cause);
  }
}

@Exception
export class ServiceUnavailable extends ApiError {
  constructor(message?: string, cause?: any) {
    super(503, message, cause);
  }
}
