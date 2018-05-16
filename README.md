# TyX Core Framework

Serverless back-end framework in TypeScript for AWS Lambda. 
Declarative dependency injection and event binding.

# Table of Contents

  * [1. Installation](#1-installation)
  * [2. Examples of Usage](#2-examples-of-usage)
      - [2.1. Simple service](#21-simple-service)
      - [2.2. Dependency injection](#22-dependency-injection)
      - [2.3. Function per service](#23-function-per-service)
      - [2.4. Remote service](#24-remote-service)
      - [2.5. Authorization](#25-authorization)
      - [2.6. Express service](#26-express-service)
      - [2.7. Error handling](#27-error-handling)
      - [2.8. Configuration](#28-configuration)
  * [3. Concepts Overview](#3-concepts-overview)
      - [3.1. Serverless Environment](#31-serverless-environment)
      - [3.2. Service](#32-service)
      - [3.3. Events](#33-events)
      - [3.4. Container](#34-container)
      - [3.5. Proxy](#35-proxy)
  * [4. Data Structures](#4-data-structures)
      - [4.1. Request Object](#41-request-object)
      - [4.2. Context Object](#42-context-object)
  * [5. Service Decorators](#5-service-decorators)
      - [5.1. @Service decorator](#51-service-decorator)
      - [5.2. @Inject decorator](#52-inject-decorator)
      - [5.3. @Proxy decorator](#53-proxy-decorator)
  * [6. HTTP Decorators](#6-http-decorators)
      - [6.1. @Get decorator](#61-get-decorator)
      - [6.2. @Post decorator](#62-post-decorator)
      - [6.3. @Put decorator](#63-put-decorator)
      - [6.4. @Delete decorator](#64-delete-decorator)
      - [6.5. @Patch decorator](#65-patch-decorator)
      - [6.6. @ContentType decorator](#66-contenttype-decorator)
      - [6.7. HttpAdapter function](#67-httpadapter-function)
  * [7. Method Argument Decorators](#7-method-argument-decorators)
      - [7.1. @PathParam decorator](#71-pathparam-decorator)
      - [7.2. @PathParams decorator](#72-pathparams-decorator)
      - [7.3. @QueryParam decorator](#73-queryparam-decorator)
      - [7.4. @QueryParams decorator](#74-queryparams-decorator)
      - [7.5. @HeaderParam decorator](#75-headerparam-decorator)
      - [7.6. @Body decorator](#76-body-decorator)
      - [7.7. @BodyParam decorator](#77-bodyparam-decorator)
      - [7.8. @ContextObject decorator](#78-contextobject-decorator)
      - [7.9. @ContextParam decorator](#79-contextparam-decorator)
      - [7.10. @RequestObject decorator](#710-requestobject-decorator)
  * [8. Authorization Decorators](#8-authorization-decorators)
      - [8.1. @Public decorator](#81-public-decorator)
      - [8.2. @Private decorator](#82-private-decorator)
      - [8.3. @Internal decorator](#83-internal-decorator)
      - [8.4. @Remote decorator](#84-remote-decorator)
      - [8.5. @Query decorator](#85-query-decorator)
      - [8.6. @Command decorator](#86-command-decorator)
      - [8.7. @Invoke decorator](#87-invoke-decorator)
  * [9. Interfaces and Classes](#9-interfaces-and-classes)
      - [9.1. Service](#91-service)
      - [9.2. Proxy](#92-proxy)
      - [9.3. Containers](#93-containers)
      - [9.4. Configuration](#94-configuration)
      - [9.5. Security](#95-security)
      - [9.6. Logger](#96-logger)
      - [9.7. Express Service](#97-express-service)
      

## 1. Installation

Install module:

`npm install tyx --save`

`reflect-metadata` shim is required:

`npm install reflect-metadata --save`

and make sure to import it before you use tyx:

```typescript
import "reflect-metadata";
```

Its important to set these options in `tsconfig.json` file of your project:

```json
{
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true
}
```

## 2. Examples of Usage

The following examples are constructed to cover all features of TyX.

> TODO: How to build and run the examples

### 2.1. Simple service

The most basic use scenario is a REST service. It is not required to inherit any base classes; use of the provided decorators is sufficient to bind service methods to corresponding HTTP methods and paths: `@Get`, `@Post`, `@Put`, `@Delete`. Method arguments bind to request elements using decorators as well; `@QueryParam`, `@PathParam` and `@Body` are the core binding.

Use of `@Service()` decorator is mandatory to mark the class as service and enable proper collection of metadata emitted from decorators.
As security consideration TyX does not default to public access for service methods, `@Public()` decorator must be explicitly provided otherwise the HTTP binding is effectively disabled.

For simplicity in this example all files are in the same folder `package.json`, `service.ts`, `function.ts`, `local.ts` and `serverless.yml`

#### Service implementation

```typescript
import { Service, Public, PathParam, QueryParam, Body, Get, Post, Put, Delete } from "tyx";

@Service()
export class NoteService {

    @Public()
    @Get("/notes")
    public getAll(@QueryParam("filter") filter?: string) {
        return { action: "This action returns all notes", filter };
    }

    @Public()
    @Get("/notes/{id}")
    public getOne(@PathParam("id") id: string) {
        return { action: "This action returns note", id };
    }

    @Public()
    @Post("/notes")
    public post(@Body() note: any) {
        return { action: "Saving note...", note };
    }

    @Public()
    @Put("/notes/{id}")
    public put(@PathParam("id") id: string, @Body() note: any) {
        return { action: "Updating a note...", id, note };
    }

    @Public()
    @Delete("/notes/{id}")
    public remove(@PathParam("id") id: string) {
        return { action: "Removing note...", id };
    }
}
```

#### Lambda function

Services are plain decorated classes unaware of the specifics of AWS Lambda, the provided `LambdaContainer` class takes care of managing the service and dispatching the trigger events. The container `export()` provides the `handler` entry point for the lambda function. 

```typescript
import { LambdaContainer, LambdaHandler } from "tyx";
import { NoteService } from "./service";

// Creates an Lambda container and publish the service.
let container = new LambdaContainer("tyx-sample1")
    .publish(NoteService);
// Export the lambda handler function
export const handler: LambdaHandler = container.export();
```

#### Express container

For local testing developers can use the `ExpressContainer` class, it exposes routes based on service method decorations. When run in debug mode from an IDE (such as VS Code) it allows convenient debugging experience. 

```typescript
import { ExpressContainer } from "tyx";
import { NoteService } from "./service";

// Creates an Express container and publish the service.
let express = new ExpressContainer("tyx-sample1")
    .publish(NoteService);
// Start express server
express.start(5000);
```

Open in browser `http://localhost:5000/notes` or `http://localhost:5000/notes/1`.

#### Serverless file

Serverless Framework is used to package and deploy functions developed in TyX. Events declared in `serverless.yml` should match those exposed by services published in the function `LambdaContainer`. Missing to declare the event will result in ApiGateway rejecting the request, having events (paths) not bound to any service method will result in the container rejecting the request. 

```yaml
service: tyx-sample1

provider:
  name: aws
  region: us-east-1
  stage: demo
  runtime: nodejs6.10
  memorySize: 128
  timeout: 5
  
  environment:
    STAGE: ${self:service}-${opt:stage, self:provider.stage}
    LOG_LEVEL: INFO
  
functions:
  notes-function:
    handler: function.handler
    events:
      - http:
          path: notes
          method: GET
          cors: true
      - http:
          path: notes/{id}
          method: GET
          cors: true
      - http:
          path: notes/{id}
          method: POST
          cors: true
      - http:
          path: notes/{id}
          method: PUT
          cors: true
      - http:
          path: notes/{id}
          method: DELETE
          cors: true
```

### 2.2. Dependency injection

It is possible write an entire application as single service but this is rarely justified. It make sense to split the application logic into multiple services each encapsulating related actions and responsibilities.

This example has a more elaborate structure, separate service API definition and implementation using dependency injection. Two of of the services are for private use within the same container not exposing any event bindings.

The folder structure used starting with this example:
- `api/` scripts with service API definition
- `services/` implementations
- `functions/` scripts with `LambdaContainer` exporting a handler function
- `local/` local run using `ExpressContainer`
- `serverless.yml` Serverless Framework

Following examples will further build on this to split services into dedicated functions and then into separate applications (Serverless projects).

#### API definition

TypeScript interfaces have no corresponding representation once code compiles to JavaScript; so to use the interface as service identifier it is also declared and exported as a constant. This is allowed as TypeScript supports declaration merging. 

The services API are returning Promises, this should be a default practice as real life service implementations will certainly use external libraries that are predominantly asynchronous. TypeScript support for `async` and `await` makes the code concise and clean.

- `api/box.ts`
```typescript 
export const BoxApi = "box";

export interface BoxApi {
    produce(type: string): Promise<Box>;
}

export interface Box {
    service: string;
    id: string;
    type: string;
}
```

- `api/item.ts`
```typescript 
export const ItemApi = "item";

export interface ItemApi {
    produce(type: string): Promise<Item>;
}

export interface Item {
    service: string;
    id: string;
    name: string;
}
```

- `api/factory.ts`
```typescript
import { Box } from "./box";
import { Item } from "./item";

export const FactoryApi = "factory";

export interface FactoryApi {
    produce(boxType: string, itemName: string): Promise<Product>;
}

export interface Product {
    service: string;
    timestamp: string;
    box: Box;
    item: Item;
}
```

#### Services implementation

Interfaces are used as service names `@Service(BoxApi)` and `@Inject(ItemApi)` as well as types of the injected properties (dependencies). Dependencies are not part of the service API but its implementation. TypeScript access modifiers (`public`, `private`, `protected`) are not enforced in runtime so injected properties can be declared `protected` as a convention choice.

> Imports of API declarations are skipped in the code samples.

- `services/box.ts`
```typescript
@Service(BoxApi)
export class BoxService implements BoxApi {
    private type: string;
    constructor(type: string) {
        this.type = type || "default";
    }

    @Private()
    public async produce(type: string): Promise<Box> {
        return {
            service: ServiceMetadata.service(this),
            id: Utils.uuid(),
            type: type || this.type
        };
    }
}
```

- `services/item.ts`
```typescript
@Service(ItemApi)
export class ItemService implements ItemApi {
    @Private()
    public async produce(name: string): Promise<Item> {
        return {
            service: ServiceMetadata.service(this),
            id: Utils.uuid(),
            name
        };
    }
}
```

The `@Private()` declaration documents that the methods are intended for invocation within the container.

- `services/factory.ts`
```typescript
@Service(FactoryApi)
export class FactoryService implements FactoryApi {

    @Inject(BoxApi)
    protected boxProducer: BoxApi;

    @Inject(ItemApi)
    protected itemProducer: ItemApi;

    @Public()
    @Get("/product")
    public async produce(@QueryParam("box") boxType: string, @QueryParam("item") itemName: string): Promise<Product> {
        let box: Box = await this.boxProducer.produce(boxType);
        let item: Item = await this.itemProducer.produce(itemName || "item");
        return {
            service: ServiceMetadata.service(this),
            timestamp: new Date().toISOString(),
            box,
            item
        };
    }
}
```

#### Lambda function

The container can host multiple services but only those provided with `publish()` are exposed for external requests. Both `register()` and `publish()` should be called with the service constructor function (class), followed by any constructor arguments if required.

```typescript
let container = new LambdaContainer("tyx-sample2")
    // Internal services
    .register(BoxService, "simple")
    .register(ItemService)
    // Public service
    .publish(FactoryService);

export const handler: LambdaHandler = container.export();
```

#### Express container
```typescript
let express = new ExpressContainer("tyx-sample2")
    // Internal services
    .register(BoxService, "simple")
    .register(ItemService)
    // Public service
    .publish(FactoryService);

express.start(5000);
```

#### Serverless file

The Serverless file is only concerned with Lambda functions not the individual TyX services within those functions.

```yaml
service: tyx-sample2

provider:
  name: aws
  region: us-east-1
  stage: demo
  runtime: nodejs6.10
  memorySize: 128
  timeout: 5
  
  environment:
    STAGE: ${self:service}-${opt:stage, self:provider.stage}
    LOG_LEVEL: INFO

functions:
  factory-function:
    handler: functions/factory.handler
    events:
      - http:
          path: product
          method: GET
          cors: true
```

### 2.3. Function per service

Decoupling the service API and implementation in the previous example allows to split the services into their own dedicated functions. This is useful when service functions need to have fine tuned settings; starting from the basic, memory and timeout, environment variables (configuration) up to IAM role configuration.

When deploying services in dedicated functions service-to-service communication is no longer a method call inside the same Node.js process. To allow transparent dependency injection TyX provides for proxy service implementation that using direct Lambda to Lambda function invocations supported by AWS SDK.

#### API definition
Identical to example [2.2. Dependency injection](#22-dependency-injection)

#### Services implementation

The only difference from previous example is that `BoxService` and `ItemService` have their method decorated with `@Remote()` instead of `@Private()`. This allows the method to be called outside of the host Lambda functions.

- `services/box.ts`
```typescript
@Service(BoxApi)
export class BoxService implements BoxApi {
    private type: string;
    constructor(type: string) {
        this.type = type || "default";
    }

    @Remote()
    public async produce(type: string): Promise<Box> {
        return {
            service: ServiceMetadata.service(this),
            id: Utils.uuid(),
            type: type || this.type
        };
    }
}
```

- `services/item.ts`
```typescript
@Service(ItemApi)
export class ItemService implements ItemApi {
    @Remote()
    public async produce(name: string): Promise<Item> {
        return {
            service: ServiceMetadata.service(this),
            id: Utils.uuid(),
            name
        };
    }
}
```

- `services/factory.ts`
```typescript
@Service(FactoryApi)
export class FactoryService implements FactoryApi {

    @Inject(BoxApi)
    protected boxProducer: BoxApi;

    @Inject(ItemApi)
    protected itemProducer: ItemApi;

    @Public()
    @Get("/product")
    public async produce(@QueryParam("box") boxType: string, @QueryParam("item") itemName: string): Promise<Product> {
        let box: Box = await this.boxProducer.produce(boxType);
        let item: Item = await this.itemProducer.produce(itemName || "item");
        return {
            service: ServiceMetadata.service(this),
            timestamp: new Date().toISOString(),
            box,
            item
        };
    }
}
```

#### Proxy implementation

The provided `LambdaProxy` class takes care of invoking the remote function and converting back the received result or error thrown.
The `@Proxy` decorator is mandatory and requires at minimum the name of the proxied service. 

The full signature however is `@Proxy(service: string, application?: string, functionName?: string)`, when not provided `application` defaults to the identifier specified in `LambdaContainer` constructor; `functionName` defaults to `{service}-function`, in this example `box-function` and `item-function` respectively.

- `proxies/box.ts`
```typescript
@Proxy(BoxApi)
export class BoxProxy extends LambdaProxy implements BoxApi {
    public async produce(type: string): Promise<Box> {
        return this.proxy(this.produce, arguments);
    }
}

- `proxies/item.ts`
@Proxy(ItemApi)
export class ItemProxy extends LambdaProxy implements ItemApi {
    public async produce(name: string): Promise<Item> {
        return this.proxy(this.produce, arguments);
    }
}
```

#### Lambda functions

The argument passed to `LambdaContainer` is application id and should correspond to the `service` setting in `serverless.yml`. Function-to-function requests within the same application are considered internal, while between different applications as remote. TyX has an authorization mechanism that distinguishes these two cases requiring additional settings. This example is about internal calls, next one covers remote calls. When internal function-to-function calls are used `INTERNAL_SECRET` configuration variable must be set; this is a secret key that both the invoking and invoked function must share so `LambdaContainer` can authorize the requests.

- Box function
```typescript
let container = new LambdaContainer("tyx-sample3")
    .publish(BoxService, "simple");

export const handler: LambdaHandler = container.export();
```

- Item function
```typescript
let container = new LambdaContainer("tyx-sample3")
    .publish(ItemService);

export const handler: LambdaHandler = container.export();
```

- Factory function
```typescript
let container = new LambdaContainer("tyx-sample3")
    // Use proxy instead of service implementation
    .register(BoxProxy)
    .register(ItemProxy)
    .publish(FactoryService);

export const handler: LambdaHandler = container.export();
```

#### Express container

The following code allows to execute the `FactoryService` in the local container while the proxies will interact with the deployed functions on AWS. 
The provided `config.ts` provides the needed `environment` variables defined in `serverless.yml`.

- `local/main.ts`
```typescript
import { Config } from "./config";

// Required for accessing Lambda via proxy on AWS
import AWS = require("aws-sdk");
AWS.config.region = "us-east-1";

let express = new ExpressContainer("tyx-sample3")
    .register(DefaultConfiguration, Config)
    .register(BoxProxy)
    .register(ItemProxy)
    .publish(FactoryService);

express.start(5000);
```

- `local/config.ts`
```typescript
export const Config = {
    STAGE: "tyx-sample3-demo",
    INTERNAL_SECRET: "7B2A62EF85274FA0AA97A1A33E09C95F",
    LOG_LEVEL: "INFO"
};
```


#### Serverless file

Since internal function-to-function requests are use `INTERNAL_SECRET` is set; this should be an application specific random value (e.g. UUID).
The additional setting `REMOTE_SECRET_TYX_SAMPLE4` is to allow remote requests from the next example.

It is necessary to allow the IAM role to `lambda:InvokeFunction`, of course it is recommended to be more specific about the Resource than in this example.

```yaml
service: tyx-sample3

provider:
  name: aws
  region: us-east-1
  stage: demo
  runtime: nodejs6.10
  memorySize: 128
  timeout: 10
  
  environment:
    STAGE: ${self:service}-${opt:stage, self:provider.stage}
    INTERNAL_SECRET: 7B2A62EF85274FA0AA97A1A33E09C95F
    REMOTE_SECRET_TYX_SAMPLE4: D718F4BBCC7345749378EF88E660F701
    LOG_LEVEL: DEBUG
  
  iamRoleStatements: 
    - Effect: Allow
      Action:
        - lambda:InvokeFunction
      Resource: "arn:aws:lambda:${opt:region, self:provider.region}:*:*"

functions:
  box-function:
    handler: functions/box.handler
  item-function:
    handler: functions/item.handler
  factory-function:
    handler: functions/factory.handler
    events:
      - http:
          path: product
          method: GET
          cors: true
```

### 2.4. Remote service

Building upon the previous example this one demonstrates a remote request via `LambdaProxy`. The request is considered remote because involved services are deployed as separate serverless project - the previous example.  

When remote function-to-function calls are used `REMOTE_SECRET_(APPID)` and `REMOTE_STAGE_(APPID)` configuration variables must be set. The first is a secret key that both the invoking and invoked function must share so `LambdaContainer` can authorize the calls; the second is `(service)-(stage)` prefix that Serverless Framework prepends to function names by default. 

#### API definition
Identical to example [2.2. Dependency injection](#22-dependency-injection)

#### Services implementation

`BoxApi` and `ItemApi` are not implemented as services in this example project, those provided and deployed by the previous example will be used via function-to-function calls.

```typescript
@Service(FactoryApi)
export class FactoryService implements FactoryApi {

    @Inject(BoxApi, "tyx-sample3")
    protected boxProducer: BoxApi;

    @Inject(ItemApi, "tyx-sample3")
    protected itemProducer: ItemApi;

    @Public()
    @Get("/product")
    public async produce(@QueryParam("box") boxType: string, @QueryParam("item") itemName: string): Promise<Product> {
        let box: Box = await this.boxProducer.produce(boxType);
        let item: Item = await this.itemProducer.produce(itemName || "item");
        return {
            service: ServiceMetadata.service(this),
            timestamp: new Date().toISOString(),
            box,
            item
        };
    }
}
```

#### Proxy implementation

The second parameter of `@Proxy()` decorator is provided as the target service is not in this serverless project.

```typescript
@Proxy(BoxApi, "tyx-sample3")
export class BoxProxy extends LambdaProxy implements BoxApi {
    public async produce(type: string): Promise<Box> {
        return this.proxy(this.produce, arguments);
    }
}

@Proxy(ItemApi, "tyx-sample3")
export class ItemProxy extends LambdaProxy implements ItemApi {
    public async produce(name: string): Promise<Item> {
        return this.proxy(this.produce, arguments);
    }
}
```

#### Lambda function

Only the factory service is exposed as a function.

```typescript
let container = new LambdaContainer("tyx-sample4")
    // Use proxy instead of service implementation
    .register(BoxProxy)
    .register(ItemProxy)
    .publish(FactoryService);

export const handler: LambdaHandler = container.export();
```

#### Express container
```typescript
import { Config } from "./config";

// Required for accessing Lambda via proxy on AWS
import AWS = require("aws-sdk");
AWS.config.region = "us-east-1";

let express = new ExpressContainer("tyx-sample4")
    .register(DefaultConfiguration, Config)
    .register(BoxProxy)
    .register(ItemProxy)
    .publish(FactoryService);

express.start(5000);
```

#### Serverless file

The environment variables provide the remote secret and stage for application `tyx-sample3`. In the previous example there is a matching `REMOTE_SECRET_TYX_SAMPLE4` with the same value as `REMOTE_SECRET_TYX_SAMPLE3` here, this pairs the applications. When a remote request is being prepared the secret for the target application is being used; when a remote request is received the secret corresponding to the requesting application is used to authorize the request.

```yaml
service: tyx-sample4

provider:
  name: aws
  region: us-east-1
  stage: demo
  runtime: nodejs6.10
  memorySize: 128
  timeout: 10
  
  environment:
    STAGE: ${self:service}-${opt:stage, self:provider.stage}
    REMOTE_SECRET_TYX_SAMPLE3: D718F4BBCC7345749378EF88E660F701
    REMOTE_STAGE_TYX_SAMPLE3: tyx-sample3-demo
    LOG_LEVEL: DEBUG
  
  iamRoleStatements: 
    - Effect: Allow
      Action:
        - lambda:InvokeFunction
      Resource: "arn:aws:lambda:${opt:region, self:provider.region}:*:*"

functions:
  factory-function:
    handler: functions/factory.handler
    events:
      - http:
          path: product
          method: GET
          cors: true
```

### 2.5. Authorization

TyX supports role-based authorization allowing to control access on service method level. There is no build-in authentication support, for the purpose of this example a hard-coded login service is used. The authorization is using JSON Web Token that are issued and validated by a build-in `Security` service. The container instantiate the default security service if non is registered and use it to validate all requests to non-public service methods.

Apart from the `@Public()` permission decorator `@Query<R>()` and `@Command<R>()` are provided to decorate service methods reflecting if the execution results in data retrieval or manipulation (changes).

#### API definition

- `api/app.ts` Definition of application roles interface, used as generic parameter of permission decorators.
```typescript
import { Roles } from "tyx";

export interface AppRoles extends Roles {
    Admin: boolean;
    Manager: boolean;
    Operator: boolean;
}
```

- `api/login.ts` Login service API
```typescript
export const LoginApi = "login";

export interface LoginApi {
    login(userId: string, password: string): Promise<string>;
}
```

- `api/factory.ts` Extended factory API
```typescript
export const FactoryApi = "factory";

export interface FactoryApi {
    // Admin only
    reset(userId: string): Promise<Response>;
    createProduct(userId: string, productId: string, name: string): Promise<Confirmation>;
    removeProduct(userId: string, productId: string): Promise<Confirmation>;

    // Admin & Manager
    startProduction(userId: string, role: string, productId: string, order: any): Promise<Confirmation>;
    stopProduction(userId: string, role: string, productId: string, order: any): Promise<Confirmation>;

    // Operator
    produce(userId: string, role: string, productId: string): Promise<Item>;

    // Public
    status(userId: string, role: string): Promise<Status>;
}

export interface Response {
    userId: string;
    role: string;
    status: string;
}

export interface Product {
    productId: string;
    name: string;
    creator: string;
    production: boolean;
}

export interface Confirmation extends Response {
    product: Product;
    order?: any;
}

export interface Item extends Response {
    product: Product;
    itemId: string;
    timestamp: string;
}

export interface Status extends Response {
    products: Product[];
}
```

#### Login implementation

The login service provides a public entry point for users to obtain an access token. The injected `Security` service is always present in the container.

```typescript
@Service(LoginApi)
export class LoginService implements LoginApi {

    @Inject(Security)
    protected security: Security;

    @Public()
    @Post("/login")
    @ContentType("text/plain")
    public async login(
            @BodyParam("userId") userId: string,
            @BodyParam("password") password: string): Promise<string> {
        let role: string = undefined;
        switch (userId) {
            case "admin": role = password === "nimda" && "Admin"; break;
            case "manager": role = password === "reganam" && "Manager"; break;
            case "operator": role = password === "rotarepo" && "Operator"; break;
        }
        if (!role) throw new Unauthorized("Unknown user or invalid password");
       return await this.security.issueToken({ subject: "user:internal", userId, role });
    }
}
```

#### Service implementation

Methods `reset()`, `createProduct()` and `removeProduct()` are decorated with `@Command<AppRoles>({ Admin: true, Manager: false, Operator: false })` allowing only Admin users to invoke them via the HTTP bindings specified with `@Post()` and `@Delete()` decorators.

Methods `startProduction()` and `stopProduction()` are allowed to Admin and Manager role; both bind to the same path `@Put("/product/{id}", true)` however the second param set to `true` instructs the container that `Content-Type` header will have an additional parameter `domain-model` equal to the method name so to select the desired action, e.g. `Content-Type: application/json;domain-model=startProduction`.

Method `produce()` is allowed for all three roles but not for public access. Public access is allowed to method `status()` with `@Query<AppRoles>({ Public: true, Admin: true, Manager: true, Operator: true })`.

When the userId, role or other authorization attributes are needed in method logic `@ContextParam("auth.{param}")` can be used to bind the arguments. Other option is to use `@ContextObject()` and so get the entire context object as single attribute.

> Having a service state `products` is for example purposes only, Lambda functions must persist the state in cloud services (e.g. DynamoDB).

```typescript
@Service(FactoryApi)
export class FactoryService implements FactoryApi {

    private products: Record<string, Product> = {};

    // Admin only

    @Command<AppRoles>({ Admin: true, Manager: false, Operator: false })
    @Post("/reset")
    public async reset(
        @ContextParam("auth.userId") userId: string): Promise<Response> {
        this.products = {};
        return { userId, role: "Admin", status: "Reset" };
    }

    @Command<AppRoles>({ Admin: true, Manager: false, Operator: false })
    @Post("/product")
    public async createProduct(
        @ContextParam("auth.userId") userId: string,
        @BodyParam("id") productId: string,
        @BodyParam("name") name: string): Promise<Confirmation> {

        if (this.products[productId]) throw new BadRequest("Duplicate product");
        let product = { productId, name, creator: userId, production: false, orders: [] };
        this.products[productId] = product;
        return { userId, role: "Admin", status: "Create product", product };
    }

    @Command<AppRoles>({ Admin: true, Manager: false, Operator: false })
    @Delete("/product/{id}")
    public async removeProduct(
        @ContextParam("auth.userId") userId: string,
        @PathParam("id") productId: string): Promise<Confirmation> {

        let product = this.products[productId];
        if (!product) throw new NotFound("Product not found");
        delete this.products[productId];
        return { userId, role: "Admin", status: "Remove product", product };
    }

    // Admin & Manager

    @Command<AppRoles>({ Admin: true, Manager: true, Operator: false })
    @Put("/product/{id}", true)
    public async startProduction(
        @ContextParam("auth.userId") userId: string,
        @ContextParam("auth.role") role: string,
        @PathParam("id") productId: string,
        @Body() order: any): Promise<Confirmation> {

        let product = this.products[productId];
        if (!product) throw new NotFound("Product not found");
        product.production = true;
        product.orders.push(order);
        return { userId, role, status: "Production started", product, order };
    }

    @Command<AppRoles>({ Admin: true, Manager: true, Operator: false })
    @Put("/product/{id}", true)
    public async stopProduction(
        @ContextParam("auth.userId") userId: string,
        @ContextParam("auth.role") role: string,
        @PathParam("id") productId: string,
        @Body() order: any): Promise<Confirmation> {

        let product = this.products[productId];
        if (!product) throw new NotFound("Product not found");
        product.production = false;
        product.orders.push(order);
        return { userId, role, status: "Production stopped", product, order };
    }

    // + Operator

    @Command<AppRoles>({ Admin: true, Manager: true, Operator: true })
    @Get("/product/{id}")
    public async produce(
        @ContextParam("auth.userId") userId: string,
        @ContextParam("auth.role") role: string,
        @PathParam("id") productId: string): Promise<Item> {

        let product = this.products[productId];
        if (!product) throw new NotFound("Product not found");
        if (!product.production) throw new BadRequest("Product not in production");
        let item: Item = {
            userId, role,
            status: "Item produced",
            product,
            itemId: Utils.uuid(),
            timestamp: new Date().toISOString()
        };
        return item;
    }

    @Query<AppRoles>({ Public: true, Admin: true, Manager: true, Operator: true })
    @Get("/status")
    public async status(
        @ContextParam("auth.userId") userId: string,
        @ContextParam("auth.role") role: string): Promise<Status> {

        let products = [];
        Object.keys(this.products).forEach(k => products.push(this.products[k]));
        return { userId, role, status: "Status", products };
    }
}
```


#### Lambda functions

Login and Factory services are independent so can be deployed as separate functions.

- `services/factory.ts`
```typescript
let container = new LambdaContainer("tyx-sample5")
    .publish(FactoryService);

export const handler: LambdaHandler = container.export();
```

- `services/login.ts` 
```typescript
let container = new LambdaContainer("tyx-sample5")
    .publish(LoginService);

export const handler: LambdaHandler = container.export();
```

#### Express container

The container constructor accepts an additional argument that is path prefix for all exposed routes. In this case `/demo` match how Api Gateway by default will include the stage name in the path.

```typescript
import { Config } from "./config";

let express = new ExpressContainer("tyx-sample5", "/demo")
    .register(DefaultConfiguration, Config)
    .publish(LoginService)
    .publish(FactoryService);

express.start(5000);
```

#### Serverless file

When using authorization it is necessary to provide a `HTTP_SECRET` that is used to sign and verify the web tokens as well as `HTTP_TIMEOUT` how long the tokens are valid.

```yaml
service: tyx-sample5

provider:
  name: aws
  region: us-east-1
  stage: demo
  runtime: nodejs6.10
  memorySize: 128
  timeout: 10
  
  environment:
    STAGE: ${self:service}-${opt:stage, self:provider.stage}
    HTTP_SECRET: 3B2709157BD8444BAD42DE246D41BB35
    HTTP_TIMEOUT: 2h
    LOG_LEVEL: DEBUG
  
functions:
  login-function:
    handler: functions/login.handler
    events:
      - http:
          path: login
          method: POST
          cors: true
  factory-function:
    handler: functions/factory.handler
    events:
      - http:
          path: reset
          method: POST
          cors: true
      - http:
          path: product
          method: POST
          cors: true
      - http:
          path: product/{id}
          method: DELETE
          cors: true
      - http:
          path: product/{id}
          method: PUT
          cors: true
      - http:
          path: product/{id}
          method: GET
          cors: true
      - http:
          path: status
          method: GET
          cors: true
```

#### Token sample

When posting to example `LoginService` at `/demo/login` with json body `{ userId: "admin", password: "nimda" }` a token is received as plain text:

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.
eyJvaWQiOiJhZG1pbiIsInJvbGUiOiJBZG1pbiIsImlhdCI6MTUwODk0NDI5NywiZX
hwIjoxNTA4OTUxNDk3LCJhdWQiOiJ0eXgtc2FtcGxlNSIsImlzcyI6InR5eC1zYW1w
bGU1Iiwic3ViIjoidXNlcjppbnRlcm5hbCIsImp0aSI6ImI4N2U1MDYyLTYwNjItND
k0Ny1iMTU1LWZmNzA0NzBhMTEzZCJ9.
b8H27N26QKFbFofuMPd1PGQHG7UeB5J1FIoQIte-dss
```

Decoded it contains the minimum info for the security service:

- `oid` is user identifier
- `role` application role
- `iat` issued-at timestamp
- `exp` expiry timestamp
- `aud` application id the token is intended to
- `iss` application id issuing the token
- `sub` subject / token type
- `jti` unique token id 

```json
{
  "alg": "HS256",
  "typ": "JWT"
}
{
  "oid": "admin",
  "role": "Admin",
  "iat": 1508944297,
  "exp": 1508951497,
  "aud": "tyx-sample5",
  "iss": "tyx-sample5",
  "sub": "user:internal",
  "jti": "b87e5062-6062-4947-b155-ff70470a113d"
}
```

### 2.6. Express service

Express is an established node.js web framework and there is a wealth of third party middleware packages that may not be available in other form. The `ExpressService` base class uses [aws-serverless-express](https://github.com/awslabs/aws-serverless-express) to host an Express application. This is not intended to host existing Express applications but more as a solution to bridge the gap for specific functionalities, for example use [Passport.js](http://www.passportjs.org/) to implement user authentication.

#### API definition

Service methods delegating to Express must have a signature `method(ctx: Context, req: HttpRequest): Promise<HttpResponse>`, the service can have ordinary methods as well.

```typescript
export const ExampleApi = "example";

export interface ExampleApi {
    hello(): string;
    onGet(ctx: Context, req: HttpRequest): Promise<HttpResponse>;
    onPost(ctx: Context, req: HttpRequest): Promise<HttpResponse>;
    other(ctx: Context, req: HttpRequest): Promise<HttpResponse>;
}
```

#### Service implementation

Multiple routes delegated to Express for processing can be declared with decorators over a single method, such as `other()` in the example or over dedicated methods such as `onGet()` and `onPost()` to allow for logic preceding or following the Express processing. Presence of `@ContentType("RAW")` is required to pass the result verbatim to the user (`statusCode`, `headers`, `body` as generated by Express) otherwise the returned object will be treated as a json body. 

The base class requires to implement the abstract method `setup(app: Express, ctx: Context, req: HttpRequest): void` that setup the Express app to be used for request processing. Each instance of the express app is used for a single request, no state can be maintained inside Lambda functions.

```typescript
import BodyParser = require("body-parser");

@Service(ExampleApi)
export class ExampleService extends ExpressService implements ExampleApi {

    @Public()
    @Get("/hello")
    @ContentType("text/plain")
    public hello(): string {
        return "Express service ...";
    }

    @Public()
    @Get("/app")
    @ContentType("RAW")
    public async onGet(@ContextObject() ctx: Context, @RequestObject() req: HttpRequest): Promise<HttpResponse> {
        return super.process(ctx, req);
    }

    @Public()
    @Post("/app")
    @ContentType("RAW")
    public async onPost(@ContextObject() ctx: Context, @RequestObject() req: HttpRequest): Promise<HttpResponse> {
        return super.process(ctx, req);
    }

    @Public()
    @Put("/app")
    @Delete("/app/{id}")
    @ContentType("RAW")
    public async other(@ContextObject() ctx: Context, @RequestObject() req: HttpRequest): Promise<HttpResponse> {
        return super.process(ctx, req);
    }

    protected setup(app: Express, ctx: Context, req: HttpRequest): void {
        app.register(BodyParser.json());

        app.get("/app", (xreq, xres) => this.flush(xreq, xres, ctx, req));
        app.post("/app", (xreq, xres) => this.flush(xreq, xres, ctx, req));
        app.put("/app", (xreq, xres) => this.flush(xreq, xres, ctx, req));
        app.delete("/app/:id", (xreq, xres) => this.flush(xreq, xres, ctx, req));
    }

    private flush(xreq: Request, xres: Response, ctx: Context, req: HttpRequest) {
        let result = {
            msg: `Express ${req.method} method`,
            path: xreq.path,
            method: xreq.method,
            headers: xreq.headers,
            params: xreq.params,
            query: xreq.query,
            body: xreq.body,
            lambda: { ctx, req }
        };
        xres.send(result);
    }
}
```

#### Lambda function
```typescript
let container = new LambdaContainer("tyx-sample6")
    .publish(ExampleService);

export const handler: LambdaHandler = container.export();
```

#### Express container

Applications containing express services can be run with the `ExpressContainer`, the container express instance and the internal service instance remain completely separate.

```typescript
let express = new ExpressContainer("tyx-sample6")
    .publish(ExampleService);

express.start(5000);
```

#### Serverless file

There no special requirements for functions hosting Express services.

```yaml
service: tyx-sample6

provider:
  name: aws
  region: us-east-1
  stage: demo
  runtime: nodejs6.10
  memorySize: 128
  timeout: 10
  
  environment:
    STAGE: ${self:service}-${opt:stage, self:provider.stage}
    LOG_LEVEL: DEBUG
  
functions:
  example-function:
    handler: functions/example.handler
    events:
      - http:
          path: hello
          method: GET
          cors: true
      - http:
          path: app
          method: GET
          cors: true
      - http:
          path: app
          method: POST
          cors: true
      - http:
          path: app
          method: PUT
          cors: true
      - http:
          path: app/{id}
          method: DELETE
          cors: true
```

### 2.7. Error handling

Error handling is implemented in TyX containers to ensure both explicitly thrown errors and runtime errors are propagated in unified format to the calling party. Classes corespnding to standard HTTP error responses are provided: 

- `400 BadRequest`
- `401 Unauthorized`
- `403 Forbidden`
- `404 NotFound`
- `409 Conflict`
- `500 InternalServerError`
- `501 NotImplemented`
- `503 ServiceUnavailable`

#### API definition

- `api/calculator.ts` combined service
```typescript
export const CalculatorApi = "calculator";

export interface CalculatorApi {
    mortgage(amount: any, nMonths: any, interestRate: any, precision: any): Promise<MortgageResponse>;
    missing(req: any): Promise<number>;
    unhandled(req: any): Promise<number>;
}

export interface MortgageResponse {
    monthlyPayment: number;
    total: number;
    totalInterest: number;
}
```

- `api/mortgage.ts` mortgage calculation service
```typescript
export const MortgageApi = "mortgage";

export interface MortgageApi {
    calculate(amount: number, nMonths: number, interestRate: number, precision: number): Promise<number>;
}
```

- `api/missing.ts` used for proxy to missing function
```typescript
export const MissingApi = "missing";

export interface MissingApi {
    calculate(req: any): Promise<number>;
}
```

- `api/missing.ts` used for proxy to a function throwing unhandled exception
```typescript
export const UnhandledApi = "unhandled";

export interface UnhandledApi {
    calculate(req: any): Promise<number>;
}
```


#### Services implementation

- `services/calculator.ts` validates that body parameters are present and expected type.
```typescript
@Service(CalculatorApi)
export class CalculatorService implements CalculatorApi {

    @Inject(MortgageApi)
    protected mortgageService: MortgageApi;

    @Inject(MissingApi)
    protected missingService: MissingApi;

    @Inject(UnhandledApi)
    protected unhandledService: UnhandledApi;

    @Public()
    @Post("/mortgage")
    public async mortgage(@BodyParam("amount") amount: any,
        @BodyParam("nMonths") nMonths: any,
        @BodyParam("interestRate") interestRate: any,
        @BodyParam("precision") precision: any): Promise<MortgageResponse> {

        let _amount = Number.parseFloat(amount);
        let _nMonths = Number.parseFloat(nMonths);
        let _interestRate = Number.parseFloat(interestRate);
        let _precision = precision && Number.parseFloat(precision);

        // Type validation
        let errors: ApiErrorBuilder = BadRequest.builder();
        if (!Number.isFinite(_amount)) errors.detail("amount", "Amount required and must be a number, got: {input}.", { input: amount || null });
        if (!Number.isInteger(_nMonths)) errors.detail("nMonths", "Number of months required and must be a integer, got: {input}.", { input: nMonths || null });
        if (!Number.isFinite(_interestRate)) errors.detail("interestRate", "Interest rate required and must be a number, got: {input}.", { input: interestRate || null });
        if (_precision && !Number.isInteger(_precision)) errors.detail("precision", "Precision must be an integer, got: {input}.", { input: precision || null });
        if (errors.count()) throw errors.reason("calculator.mortgage.validation", "Parameters validation failed").create();

        let monthlyPayment = await this.mortgageService.calculate(_amount, _nMonths, _interestRate, _precision);

        return {
            monthlyPayment,
            total: monthlyPayment * _nMonths,
            totalInterest: (monthlyPayment * _nMonths) - _amount
        };
    }

    @Public()
    @Post("/missing")
    public async missing(@Body() req: any): Promise<number> {
        return this.missingService.calculate(req);
    }

    @Public()
    @Post("/unhandled")
    public async unhandled(@Body() req: any): Promise<number> {
        return this.unhandledService.calculate(req);
    }
}
```

- `services/mortgage.ts` simple mortgage monthly payment calculator service, `BadRequest.builder()` returns a instance of `ApiErrorBuilder` allowing to progressively compose validation errors; in this case inputs are expected to be positive numbers.
```typescript
@Service(MortgageApi)
export class MortgageService implements MortgageApi {

    @Remote()
    public async calculate(amount: number, nMonths: number, interestRate: number, precision: number = 5): Promise<number> {

        // Range validation
        let errors: ApiErrorBuilder = BadRequest.builder();
        if (amount <= 0) errors.detail("amount", "Amount must be grater than zero." );
        if (nMonths <= 0) errors.detail("nMonths", "Number of months  must be grater than zero.");
        if (interestRate <= 0) errors.detail("interestRate", "Interest rate must be grater than zero.");
        if (errors.count()) throw errors.reason("mortgage.calculate.validation", "Invalid parameters values").create();

        interestRate = interestRate / 100 / 12;
        let x = Math.pow(1 + interestRate, nMonths);
        return +((amount * x * interestRate) / (x - 1)).toFixed(precision);
    }
}
```

#### Proxy implementation

- `proxies/mortgage.ts` Mortgage calculator is deployed as a dedicated Lambda function, to demonstrate that errors just as the return value is transparently passed.

```typescript
@Proxy(MortgageApi)
export class MortgageProxy extends LambdaProxy implements MortgageApi {
    public calculate(amount: any, nMonths: any, interestRate: any): Promise<number> {
        return this.proxy(this.calculate, arguments);
    }
}
```

- `proxies/missing.ts` Calling the proxy results in error due to non-existence of the target function

```typescript
@Proxy(MissingApi)
export class MissingProxy extends LambdaProxy implements MissingApi {
    public calculate(req: any): Promise<number> {
        return this.proxy(this.calculate, arguments);
    }
}
```

- `proxies/unhandled.ts` Calling the proxy results in unhandled error

```typescript
@Proxy(UnhandledApi)
export class UnhandledProxy extends LambdaProxy implements UnhandledApi {
    public calculate(req: any): Promise<number> {
        return this.proxy(this.calculate, arguments);
    }
}
```

#### Lambda function

- `functions/calculator.ts`
```typescript
let container = new LambdaContainer("tyx-sample7")
    .register(MortgageProxy)
    .publish(CalculatorService);

export const handler: LambdaHandler = container.export();
```

- `functions/mortgage.ts`
```typescript
let container = new LambdaContainer("tyx-sample7")
    .publish(MortgageService);

export const handler: LambdaHandler = container.export();
```

- `functions/unhandled.ts` Unhandled error is thrown instead using `callback(err, null)` for handled errors
```typescript
export function handler(event: any, ctx: any, callback: (err, data) => void) {
    throw new Error("Not Implemented");
}
```

#### Serverless file

```yaml
service: tyx-sample7

provider:
  name: aws
  region: us-east-1
  stage: demo
  runtime: nodejs6.10
  memorySize: 128
  timeout: 10
  
  environment:
    STAGE: ${self:service}-${opt:stage, self:provider.stage}
    INTERNAL_SECRET: 7B2A62EF85274FA0AA97A1A33E09C95F
    INTERNAL_TIMEOUT: 5s
    LOG_LEVEL: DEBUG
  
  # permissions for all functions
  iamRoleStatements: 
    - Effect: Allow
      Action:
        - lambda:InvokeFunction
      Resource: "arn:aws:lambda:${opt:region, self:provider.region}:*:*"

functions:
  mortgage-function:
    handler: functions/mortgage.handler
  unhandled-function:
    handler: functions/unhandled.handler
  calculator-function:
    handler: functions/calculator.handler
    events:
      - http:
          path: mortgage
          method: POST
          cors: true
      - http:
          path: missing
          method: POST
          cors: true
      - http:
          path: unhandled
          method: POST
          cors: true
```

### Sample responses

When posting to `/demo/mortgage` a valid request:
```json
{
    "amount": "15000",
    "nMonths": "15",
    "interestRate": "7",
    "precision": "2"
}
```
response is received:
```json
{
    "monthlyPayment": 1047.3,
    "total": 15709.5,
    "totalInterest": 709.5
}
```

When any of required inputs is missing or not a number:
```json
{
    "amount": "15000",
    "interestRate": "zero",
    "precision": "2"
}
```
HTTP 404 Bad Request is received with the error as json body:
```json
{
	"code": 400,
	"message": "Parameters validation failed",
	"reason": {
		"code": "calculator.mortgage.validation",
		"message": "Parameters validation failed"
	},
	"details": [{
		"code": "nMonths",
		"message": "Number of months required and must be a integer, got: null.",
		"params": {
			"input": null
		}
	}, {
		"code": "interestRate",
		"message": "Interest rate required and must be a number, got: zero.",
		"params": {
			"input": "zero"
		}
	}],
	"stack": "BadRequest: Parameters validation failed\n    at CalculatorService.<anonymous> (/var/task/services/calculator.js:44:103)\n    at next (native)\n    at /var/task/services/calculator.js:19:71\n    at __awaiter (/var/task/services/calculator.js:15:12)\n    at CalculatorService.mortgage (/var/task/services/calculator.js:28:16)\n    at /var/task/node_modules/tyx/core/container/instance.js:202:47\n    at next (native)",
	"__class__": "BadRequest"
}
```

Sending a negative value will return an error generated in `MortgageService`:
```json
{
    "amount": "15000",
    "nMonths": "15",
    "interestRate": "-7",
    "precision": "2"
}
```
Error repsonse:
```json
{
	"code": 400,
	"message": "Invalid parameters values",
	"proxy": true,
	"reason": {
		"code": "mortgage.calculate.validation",
		"message": "Invalid parameters values"
	},
	"details": [{
		"code": "interestRate",
		"message": "Interest rate must be grater than zero."
	}],
	"stack": "BadRequest: Invalid parameters values\n    at MortgageService.<anonymous> (/var/task/services/mortgage.js:34:99)\n    at next (native)\n    at /var/task/services/mortgage.js:16:71\n    at __awaiter (/var/task/services/mortgage.js:12:12)\n    at MortgageService.calculate (/var/task/services/mortgage.js:24:16)\n    at /var/task/node_modules/tyx/core/container/instance.js:173:47\n    at next (native)",
	"__class__": "BadRequest"
}
```

On purpose there is no check on valid range for precision to demonstrate handling of runtime errors:
```json
{
    "amount": "15000",
    "nMonths": "15",
    "interestRate": "7",
    "precision": "25"
}
```
Responds with 500 Internal Server Error:
```json
{
	"code": 500,
	"message": "toFixed() digits argument must be between 0 and 20",
	"proxy": true,
	"cause": {
		"stack": "RangeError: toFixed() digits argument must be between 0 and 20\n    at Number.toFixed (native)\n    at MortgageService.<anonymous> (/var/task/services/mortgage.js:37:61)\n    at next (native)\n    at /var/task/services/mortgage.js:16:71\n    at __awaiter (/var/task/services/mortgage.js:12:12)\n    at MortgageService.calculate (/var/task/services/mortgage.js:24:16)\n    at /var/task/node_modules/tyx/core/container/instance.js:173:47\n    at next (native)\n    at /var/task/node_modules/tyx/core/container/instance.js:7:71\n    at __awaiter (/var/task/node_modules/tyx/core/container/instance.js:3:12)",
		"message": "toFixed() digits argument must be between 0 and 20",
		"__class__": "RangeError"
	},
	"stack": "InternalServerError: toFixed() digits argument must be between 0 and 20\n    at LambdaContainer.<anonymous> (/var/task/node_modules/tyx/aws/container.js:49:56)\n    at throw (native)\n    at rejected (/var/task/node_modules/tyx/aws/container.js:5:65)",
	"__class__": "InternalServerError"
}
```

Posting to `/demo/missing` with any json body will result in:
```json
{
	"code": 500,
	"message": "Function not found: arn:aws:lambda:us-east-1:9999999999:function:tyx-sample7-demo-missing-function",
	"cause": {
		"stack": "ResourceNotFoundException: Function not found: arn:aws:lambda:us-east-1:9999999999:function:tyx-sample7-demo-missing-function\n    at Object.extractError (/var/runtime/node_modules/aws-sdk/lib/protocol/json.js:48:27)\n    at Request.extractError (/var/runtime/node_modules/aws-sdk/lib/protocol/rest_json.js:45:8)\n    at Request.callListeners (/var/runtime/node_modules/aws-sdk/lib/sequential_executor.js:105:20)\n    at Request.emit (/var/runtime/node_modules/aws-sdk/lib/sequential_executor.js:77:10)\n    at Request.emit (/var/runtime/node_modules/aws-sdk/lib/request.js:683:14)\n    at Request.transition (/var/runtime/node_modules/aws-sdk/lib/request.js:22:10)\n    at AcceptorStateMachine.runTo (/var/runtime/node_modules/aws-sdk/lib/state_machine.js:14:12)\n    at /var/runtime/node_modules/aws-sdk/lib/state_machine.js:26:10\n    at Request.<anonymous> (/var/runtime/node_modules/aws-sdk/lib/request.js:38:9)\n    at Request.<anonymous> (/var/runtime/node_modules/aws-sdk/lib/request.js:685:12)",
		"message": "Function not found: arn:aws:lambda:us-east-1:9999999999:function:tyx-sample7-demo-missing-function",
		"code": "ResourceNotFoundException",
		"name": "ResourceNotFoundException",
		"time": "2017-10-31T08:48:27.688Z",
		"requestId": "435de987-be18-11e7-b667-657e489d6573",
		"statusCode": 404,
		"retryable": false,
		"retryDelay": 75.5332334968972,
		"__class__": "Error"
	},
	"stack": "InternalServerError: Function not found: arn:aws:lambda:us-east-1:9999999999:function:tyx-sample7-demo-missing-function\n    at MissingProxy.<anonymous> (/var/task/node_modules/tyx/aws/proxy.js:45:52)\n    at throw (native)\n    at rejected (/var/task/node_modules/tyx/aws/proxy.js:5:65)\n    at process._tickDomainCallback (internal/process/next_tick.js:135:7)",
	"__class__": "InternalServerError"
}
```

Posting to `/demo/unhandled` with any json body will result in:
```json
{
	"code": 500,
	"message": "RequestId: 726809f7-be19-11e7-bdb3-c7331d9214c8 Process exited before completing request",
	"stack": "InternalServerError: RequestId: 726809f7-be19-11e7-bdb3-c7331d9214c8 Process exited before completing request\n    at UnhandledProxy.<anonymous> (/var/task/node_modules/tyx/aws/proxy.js:52:52)\n    at next (native)\n    at fulfilled (/var/task/node_modules/tyx/aws/proxy.js:4:58)\n    at process._tickDomainCallback (internal/process/next_tick.js:135:7)",
	"__class__": "InternalServerError"
}
```

### 2.8. Configuration

TyX containers require the presence of the Configuration service, if one is not provided a default implementation is being used. In this example the Configuration service is extended with properties relevant to the simple timestamp service.

#### API definition

Recommended convention is to name extension as ConfigApi and ConfigService. The API must extend the `Configuration` interface, so it merged constant (service name) equals `Configuration` as well.

- `api/config.ts` extended configuration
```typescript
export const ConfigApi = Configuration;

export interface ConfigApi extends Configuration {
    timestampSecret: string;
    timestampStrength: number;
}
```

- `api/timestamp.ts` example timestamp service
```typescript
export interface TimestampApi {
    issue(data: any): TimestampResult;
    verify(input: TimestampResult): TimestampResult;
}

export interface TimestampResult {
    id: string;
    timestamp: string;
    hash: string;
    signature: string;
    data: any;
    valid?: boolean;
    error?: string;
}
```

#### Config service implementation

The implementation extends the provided `BaseConfiguration` class that is simple wrapper around a json object `this.config` which is `process.env` by default. This approach uses Environment Variables of Lambda functions that are also supported by the Serverless Framework, so configurations can be modified via AWS Console or API without a need to redeploy the function. Developers can directly implement the `Configuration` interface to use different storage.

```typescript
@Service(ConfigApi)
export class ConfigService extends BaseConfiguration implements ConfigApi {

    constructor(config?: any) {
        super(config);
    }

    get timestampSecret() { return this.config.TIMESTAMP_SECRET; }

    get timestampStrength() { return parseInt(this.config.TIMESTAMP_STRENGTH || 0); }
}
```

#### Timestamp service implementation

Example timestamp service based on SHA256.

```typescript
@Service(TimestampApi)
export class TimestampService extends BaseService implements TimestampApi {

    @Inject(ConfigApi)
    protected config: ConfigApi;

    @Public()
    @Post("/issue")
    public issue( @Body() data: any): TimestampResult {
        let result = { id: UUID(), timestamp: new Date().toISOString(), hash: null, signature: null, data };
        let text = JSON.stringify(data);
        [result.hash, result.signature] = this.sign(result.id, result.timestamp, text);
        return result;
    }

    @Public()
    @Post("/verify")
    public verify( @Body() input: TimestampResult): TimestampResult {
        if (!input.id || !input.timestamp || !input.hash || !input.signature || !input.data)
            throw new BadRequest("Invalid input format");
        let hash: string, signature: string;
        [hash, signature] = this.sign(input.id, input.timestamp, JSON.stringify(input.data));
        if (hash !== input.hash) input.error = "Hash mismatch";
        else if (signature !== input.signature) input.error = "Invalid signature";
        else input.valid = true;
        return input;
    }

    private sign(id: string, timestamp: string, input: string): [string, string] {
        if (!this.config.timestampSecret) throw new InternalServerError("Signature secret not configured");
        if (!this.config.timestampStrength) throw new InternalServerError("Signature strength not configured");
        let hash: string = SHA256(input || "");
        let signature: string = id + "/" + timestamp + "/" + hash;
        for (let i = 0; i < this.config.timestampStrength; i++)
            signature = SHA256(signature + "/" + i + "/" + this.config.timestampSecret);
        return [hash, signature];
    }
}
```

#### Lambda function

- `functions/timestamp.ts`
```typescript
let container = new LambdaContainer("tyx-sample8")
    .register(ConfigService)
    .publish(TimestampService);

export const handler: LambdaHandler = container.export();
```

#### Serverless file

The two configuration parameters are defined on function level where they are used. There is a limitation that "total size of the set does not exceed 4 KB" per function so better define variables under `provider` only when used by all or significant number of functions.

```yaml
service: tyx-sample8

provider:
  name: aws
  region: us-east-1
  stage: demo
  runtime: nodejs6.10
  memorySize: 128
  timeout: 10
  
  environment:
    STAGE: ${self:service}-${opt:stage, self:provider.stage}
    LOG_LEVEL: DEBUG

functions:
  timestamp-function:
    handler: functions/timestamp.handler
    environment:
      TIMESTAMP_SECRET: F72001057DDA40D3B7B81E7BF06CF495
      TIMESTAMP_STRENGTH: 3
    events:
      - http:
          path: issue
          method: POST
          cors: true
      - http:
          path: verify
          method: POST
          cors: true
```

### Sample responses

When posting to `/demo/issue` a json object:
```json
{
    "from": "tyx",
    "to": "world",
    "message": "Hello World ..."
}
```
signed timestamp is received:
```json
{
    "id": "c43c1de9-9561-47d3-8aed-10e4e7080b59",
    "timestamp": "2017-10-31T10:48:03.903Z",
    "hash": "760c891dd1061a843bf9a778e2fb42d28ea6aa57654474cd176ee5385c674875",
    "signature": "a3d71713bca7830d9f8b10f7841758db0e7bfd0bfcb2a450fd0caa3d8a72eca2",
    "data": {
        "from": "tyx",
        "to": "world",
        "message": "Hello World ..."
    }
}
```


## 3. Concepts Overview

TyX Core Framework aims to provide a programming model for back-end serverless solutions by leveraging TypeScript support for object oriented programming. TyX addresses how to write and structure the application back-end into services deployed as Lambda functions. 

Decorators are extensively used while inheritance from base classes is minimized. Services so written are abstracted from details how HTTP events arrive, how the response is propagated back and the internal routing in case of multiple events being served by the hosting Lambda function. These responsibilities are handled by a Container specific to the hosting environment (Lambda). As proof-of-concept and to serve as development tool an Express based container is provided allowing to run the unmodified services code.

TyX was developed with intent to be used together with [Serverless Framework](https://serverless.com/framework/) that provides rapid deployment. There is no direct dependency on the Serverless Framework so developers can opt for alternative deployment tools.

### 3.1. Serverless Environment

AWS Lambda and API Gateway are the core component of [AWS Serverless Platform](https://aws.amazon.com/serverless). API Gateway takes most of the responsibilities traditionally handled by HTTP Web Servers (e.g. Apache, nginx, IIS ...), it is the entry point for HTTP requests; however it does not directly host or manage code responsible for handling those requests. AWS Lambda is a compute service for running code without provisioning or managing servers. Lambda functions react on events, API Gateway being one of the supported sources. On each HTTP request arriving on API Gateway an event object is dispatched to an instance of a Lambda function, on its completion the function provides the response (statusCode, headers, body).

Lambda functions are subject to limitation on memory and allowed execution time, and are inherently stateless. AWS Lambda may create, destroy or reuse instances of the Lambda function to accommodate the demand (traffic). The function instance is not aware of its life-cycle. At most it can detect when handler function is first loaded but there is no notification/events when the instance is to be frozen for reuse or about to be destroyed. This prevents any meaningful internal state or cache as the function is not a continuously running process. Limited access to the file system is allowed but should not be used with assumption that stored files will be available for the next request; certainly not to run a local database.

Number of concurrently running function instances is also limited (per AWS account). Developers have no control over the max number of instances a given function can have, which is a challenge when other services or resources used by the function (e.g. database) can not support or scale to match the concurrent requests. Serverless concept removes the need to manage servers or containers for the function (business logic) execution but this does not cover the management of services those functions use. For example S3 most likely can accommodate any load of object access and manipulation concurrent Lambda functions can generate; on the contrary databases usually have limits on concurrent connections and/or the allowed read/write throughput. The Serverless environment may look very restricted and even hostile toward some traditional practices (like the mentioned in-memory caching, or local disk databases). Lambda functions are not intended to serve static files or render HTML content as with MVC frameworks, handling file uploads is also best avoided. 

TyX framework does not shield the developer from the specifics and challenges of the serverless architecture, nor does it attempt to abstract the limitations of the execution environment. 

### 3.2. Service

Services are the building block of application back-end and together with dependency injection provides for structured and flexible code organization. A service can expose only a single method with event binding, and if hosted in a dedicated Lambda function will abide to the single responsibility principle. However it may group together methods corresponding to related actions or entities, following microservice principles. TyX does not enforce a specific style or paradigm; a Lambda function can host arbitrary number of services each with its own event bindings.

Traditionally web frameworks especially those based on MVC pattern make a distinction between the concepts of Service and Controller. As TyX is aimed at back-end service layer only the notion of Service is provided; a Service having event bindings (decorators) on its methods is effectively a controller. 

Services for private (in-container) use not exposing any event bindings can be alternatively implemented as class libraries (JavaScript/TypeScript modules), so directly imported and instantiated where used. It is a matter of preference. TyX was designed to favor named services with dependency injection versus direct import of modules. TypeScript support for interfaces and abstract classes can be utilized to decouple the service interface from its implementation(s). 

### 3.3. Events

Events trigger an execution of a Lambda function; TyX resolves the service and method bound to the event and together with the event data forms a Request object representing the event and pass it to method invocation. Using the provided decorators event data elements can be mapped to method arguments or even pass the complete Request object.

Serverless Framework provides a declarative approach (`serverless.yml`) to define event mappings per function. TyX support the standard HTTP events and follows the ApiGateway path syntax. In experimental stage are event bindings for S3, DynamoDB and Kinesis Stream events.  

### 3.4. Container

In TyX the container has a twofold role both as a service registry and dependency injector and provides the entry point (handler) of the Lambda function. All services must be explicitly registered in the container either for internal use by `register` or `publish` their event bindings.

```typescript
export const container = new LambdaContainer("example")
    // Use internal services
    .register(PersistenceService)
    .register(AuditService, { level: "Detail" })
    // Publish public services
    .publish(ReviewService);
// Export the lambda handler function
export const handler: LambdaHandler = container.export();
```

Registering services requires that class (constructor) is provided optionally together with arguments to be used to call the constructor. TyX only support property injection so services are preferred to provide default constructors. It is allowed to register specific instances (objects) as well. For a class to be considered a service it must have the `@Service` decorator and optionally implement the `Service` interface. 

The container is implemented as a pool with record of the service registrations; while a container instance actually instantiate the services and resolve dependencies. So to process an event the container pool (e.g. `LambdaContainer`) will identify the event type, construct the Request object and prepare a container instance, then pass the processing to the instance. Instances are reused, once the event processing is finalized and the result is propagated back the instance is marked as ready to process the next incoming event. 

In AWS Lambda execution environment the function instance is not reused until previous execution is complete and Node.js event loop is empty (by default), so the container pool will ever have a single instance in it. This requires that any resources that may keep the event loop busy are created before event processing and closed/released after its completion, e.g. database connections. For this purpose the `Service` interface defines two optional methods `activate` and `release`; all services implementing the methods are activated before and released after each event processing cycle.

Express does not have such limitation and the provided `ExpressContainer` can concurrently process multiple incoming requests. So the design of the container as pool/instance allows to accommodate both types of execution environment; and guarantee that each service instance is exposed to one event at a time.

### 3.5. Proxy

Services hosted in different Lambda functions can communicate via their public HTTP API, however this round-trip can be avoided as AWS Lambda provides for direct function invocation. TyX implements a RMI-like communication so uses synchronous Lambda invocation necessary so the returned result or the error thrown from the invoked service are made available to the invoking service as if the invoked service was a local instance. 

AWS Lambda bills both the "waiting" time of the invoking function as well as the "running" time of invoked function; so it may not be cost effective to host each service in its own function as default approach if services are tightly coupled. With the raising popularity of the serverless paradigm hopefully AWS will offer more optimal solutions for async lambda function invocation; this is particularly relevant for microservice based solutions on AWS Lambda. 

Proxies are useful in case of integration between two applications when a subset of services are used by the other application or a dedicated service is created to provide the integration API. IAM policy can be used to further control the access beyond TyX token based authorization. TyX at moment requires that both applications (serverless projects) are deployed in the same AWS region.

> Neither AWS Lambda or the Serverless Framework have the notion of application, project or solution. The closest concept is `API Gateway API` as collection of resources and methods that are integrated with back-end Lambda functions. So all functions deployed from a serverless project are exposed as an API instance with single stage assigned a common domain name. The deployed Lambda functions are not part of a group or collection that correspond to the API they implement. 


## 4. Data Structures

Service implementations and the supporting decorators are presented with two core data structure, the Request Object and the Context Object

### 4.1. Request Object

The `HttpRequest` object is an based on HTTP event as received from API Gateway. The content type is additionally processed, if json is detected the body is parsed and made available as `json` property. Header names are converted to lowercase as convention choice.

- Interface Definition
```typescript
interface Request {
    type: "remote" | "internal" | "http" | "event";
    application: string;
    service: string;
    method: string;
    requestId: string;
}

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

interface HttpRequest extends Request {
    httpMethod: HttpMethod;
    resource: string;
    path: string;
    sourceIp: string;

    headers?: Record<string, string>;
    pathParameters?: Record<string, string>;
    queryStringParameters?: Record<string, string>;
    body?: string | null;
    isBase64Encoded?: boolean;

    json?: any;
    contentType?: HttpContentType;
}

interface HttpHeader {
    value: string;
    params: Record<string, string>;
}

interface HttpContentType extends HttpHeader {
    domainModel?: string;
    isJson?: boolean;
    isMultipart?: boolean;
}
```

- Example
```json
{
    "type": "http",
    "requestId": "bbfb7cd5-ba45-11e7-bb80-356aa0e72897",
    "sourceIp": "2.3.6.186",
    "application": "tyx-sample5",
    "service": "factory",
    "method": "startProduction",

    "httpMethod": "PUT",
    "resource": "/product/{id}",
    "path": "/product/red",
    "pathParameters": {
        "id": "red"
    },
    "queryStringParameters": {
        "dummy": "param"
    },
    "headers": {
        "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJvaWQiOiJtYW5hZ2VyIiwicm9sZSI6Ik1hbmFnZXIiLCJpYXQiOjE1MDkwMTk0MzIsImV4cCI6MTUwOTAyNjYzMiwiYXVkIjoidHl4LXNhbXBsZTUiLCJpc3MiOiJ0eXgtc2FtcGxlNSIsInN1YiI6InVzZXI6aW50ZXJuYWwiLCJqdGkiOiI5ZGJkYmMwYy0wMWRiLTRmN2ItYmY0ZS1kMmUzMmY1ZDExNWIifQ.pI_4JMgzXR4Ei9i0CH4lKsX59id-vNQqrIYzP8Yz8PI",
        "cloudfront-forwarded-proto": "https",
        "cloudfront-is-desktop-viewer": "true",
        "cloudfront-is-mobile-viewer": "false",
        "cloudfront-is-smarttv-viewer": "false",
        "cloudfront-is-tablet-viewer": "false",
        "cloudfront-viewer-country": "MK",
        "content-type": "application/json; domain-model=startProduction",
        "host": "2xuoozq2m7.execute-api.us-east-1.amazonaws.com",
        "via": "1.1 edee3ff8f335740e0ea86cf9f62b5ae9.cloudfront.net (CloudFront)",
        "x-amz-cf-id": "3s62OS3p-hVNJvXTTSF3MRNR2Y8aTz60s9HLtc-x0ZGwksJVGcRkwA==",
        "x-amzn-trace-id": "Root=1-59f1cf28-1537e44a2e2b1d5917d05402",
        "x-forwarded-for": "2.3.4.186, 54.182.239.90",
        "x-forwarded-port": "443",
        "x-forwarded-proto": "https"
    },
    "body": "{\"orderId\":\"start\"}",
    "isBase64Encoded": false,
    "contentType": {
        "value": "application/json",
        "params": {
            "domain-model": "startProduction"
        },
        "domainModel": "startProduction",
        "isJson": true,
        "isMultipart": false
    },
    "json": {
        "orderId": "start"
    }
}
```

### 4.2. Context Object

Context object contains the authorization token received, the invoked method permission definition and authorization info extracted from the token.

- Interface Definition
```typescript
interface Context {
    requestId: string;
    token: string;
    permission: PermissionMetadata;
    auth: AuthInfo;
}

interface AuthInfo {
    tokenId?: string;

    issuer?: string;
    audience?: string;
    subject: "event" | "remote" | "user:internal" | "user:external" | "user:public" | string;
    remote?: boolean;

    userId: string;
    role: string;
    email?: string;
    name?: string;
    ipAddress?: string;

    issued?: Date;
    expires?: Date;
}

interface PermissionMetadata {
    service?: string;
    method: string;
    name: string;
    roles: Roles;
}

```

- Example, role restricted method
```json
{
    "requestId": "bbfb7cd5-ba45-11e7-bb80-356aa0e72897",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJvaWQiOiJtYW5hZ2VyIiwicm9sZSI6Ik1hbmFnZXIiLCJpYXQiOjE1MDkwMTk0MzIsImV4cCI6MTUwOTAyNjYzMiwiYXVkIjoidHl4LXNhbXBsZTUiLCJpc3MiOiJ0eXgtc2FtcGxlNSIsInN1YiI6InVzZXI6aW50ZXJuYWwiLCJqdGkiOiI5ZGJkYmMwYy0wMWRiLTRmN2ItYmY0ZS1kMmUzMmY1ZDExNWIifQ.pI_4JMgzXR4Ei9i0CH4lKsX59id-vNQqrIYzP8Yz8PI",
    "permission": {
        "service": "factory",
        "method": "startProduction",
        "name": "command",
        "roles": {
            "Admin": true,
            "Manager": true,
            "Operator": false,
            "Internal": true,
            "Remote": true
        }
    },
    "auth": {
        "tokenId": "9dbdbc0c-01db-4f7b-bf4e-d2e32f5d115b",
        "subject": "user:internal",
        "issuer": "tyx-sample5",
        "audience": "tyx-sample5",
        "remote": false,
        "userId": "manager",
        "role": "Manager",
        "issued": "2017-10-26T12:03:52.000Z",
        "expires": "2017-10-26T14:03:52.000Z"
    }
}
```

- Example, public method
```json
{
    "requestId": "bbd02781-ba45-11e7-bdd5-7396a38f651f",
    "permission": {
        "service": "login",
        "method": "login",
        "name": "public",
        "roles": {
            "Public": true,
            "Internal": true,
            "Remote": true
        }
    },
    "auth": {
        "sessionId": "bbd02781-ba45-11e7-bdd5-7396a38f651f",
        "subject": "user:public",
        "issuer": "tyx-sample5",
        "audience": "tyx-sample5",
        "remote": false,
        "userId": null,
        "role": "Public",
        "issued": "2017-10-26T12:03:52.464Z",
        "expires": "2017-10-26T12:04:52.464Z"
    }
}
```

## 5. Service Decorators

### 5.1. `@Service` decorator

This decorator is used on classes, if the name is not specified the class name used as service name.

```typescript
@Service(name?: string)
```

### 5.2. `@Inject` decorator

This decorator is used on class properties that should be injected by the container. It is only valid in classes decorated with `@Service` or `@Proxy`. 

When `resource` is not provided the type name of property is used. The second argument `application` defaults to the application id specified when container is instantiated. When injecting a proxy it must match the value if provided in the `@Proxy` decorator.

```typescript
@Inject(resource?: string | Function, application?: string)
```

### 5.3. `@Proxy` decorator

This decorator is used on classes implementing service proxy. 

It is mandatory to specify the `service` name. If `application` is not provided it defaults to application id specified when container is instantiated; it is necessary to provide this attribute if the service is part of a remote application. The `functionName` defaults to `(service)-function` but can be explicitly provided.

```typescript
@Proxy(service: string, application?: string, functionName?: string)
```


## 6. HTTP Decorators

HTTP decorators are to be used over service methods, if the class is not decorated as `@Service` they have no effect.

### 6.1. `@Get` decorator

Decorate the service method to respond on HTTP GET on the specified route.

```typescript
@Get(route: string, adapter?: HttpAdapter)
```

### 6.2. `@Post` decorator

Decorate the service method to respond on HTTP POST on the specified route.

If `model` argument is not provided or `false` only one method can bind to the specified route. When `true` the incoming `Content-Type` must include parameter `domain-model=(methodName)` so allowing multiple methods to share the route. The `model` can be explicitly provided and have different value from decorated service method.

```typescript
@Post(route: string, model?: boolean | string, adapter?: HttpAdapter)
```

### 6.3. `@Put` decorator

Decorate the service method to respond on HTTP PUT on the specified route. Argument `model` as in `@Post`.

```typescript
@Put(route: string, model?: boolean | string, adapter?: HttpAdapter)
```

### 6.4. `@Delete` decorator

Decorate the service method to respond on HTTP POST on the specified route. Argument `model` as in `@Post`.

```typescript
@Delete(route: string, model?: boolean | string, adapter?: HttpAdapter)
```

### 6.5. `@Patch` decorator

Decorate the service method to respond on HTTP PATCH on the specified route. Argument `model` as in `@Post`.

```typescript
@Patch(route: string, model?: boolean | string, adapter?: HttpAdapter)
```

### 6.6. `@ContentType` decorator

Override the default content type `application/json` for the response.

```typescript
@ContentType(type: string)
```

Special type `HttpResponse` allows the method to provide a complete response corresponding to the following interface:

```typescript
interface HttpResponse {
    statusCode: HttpCode;
    contentType?: string;
    headers?: Record<string, string>;
    body: any;
}
```

### 6.7. `HttpAdapter` function

It is preferred to use [7. Method Argument Decorators] however a custom function can be provided to convert the context and request objects to method arguments. When a `HttpAdapter` is provided argument decorators are not evaluated.

```typescript
interface HttpAdapter {
    (
        next: (...args: any[]) => Promise<any>,
        ctx?: Context,
        req?: HttpRequest,
        path?: Record<string, string>,
        query?: Record<string, string>
    ): Promise<any>;
}
```
- Example with argument decorators

```typescript
@Put("/product/{id}", true)
public async startProduction(
    @ContextParam("auth.userId") userId: string,
    @ContextParam("auth.role") role: string,
    @PathParam("id") productId: string,
    @Body() order: any): Promise<Confirmation> {
}
```

- Equivalent with `HttpAdapter`

```typescript
@Put("/product/{id}", true, (next, ctx, req, path) => next(
    ctx.auth.userId,
    ctx.auth.role,
    path.id,
    req.json
))
public async startProduction(
    userId: string,
    role: string,
    productId: string,
    order: any): Promise<Confirmation> {
}
```

## 7. Method Argument Decorators

### 7.1. `@PathParam` decorator

Use `@PathParam` decorator to inject path parameters in service methods:

```typescript
@Get("/notes/{id}")
getOne(@PathParam("id") id: string) { ... }
```

### 7.2. `@PathParams` decorator

Use `@PathParams` decorator to inject record of all path parameters in service methods:

```typescript
@Get("/root/{p1}/{p2}/{p3}")
action(@PathParams() params: Record<string, string>) { ... }
```

### 7.4. `@QueryParam` decorator

To inject query parameters, use `@QueryParam` decorator:

```typescript
@Get("/notes")
getNotes(@QueryParam("limit") limit: number) { ... }
```

### 7.4. `@QueryParams` decorator

Use `@QueryParams` decorator to inject record of all query parameters in service methods:

```typescript
@Get("/notes")
getNotes(@QueryParams() query: Record<string, string>) { ... }
```

### 7.5. `@HeaderParam` decorator

To inject request header parameter, use `@HeaderParam` decorator:

```typescript
@Post("/notes")
saveNote(@HeaderParam("host") originHost: string, @Body() note: Note) { ... }
```

### 7.6. `@Body` decorator

To inject request body, use `@Body` decorator:

```typescript
@Post("/notes")
saveNote(@Body() note: Note) { ... }
```

The decorator does not support class transformation, interfaces can be used as arguments types.

### 7.7. `@BodyParam` decorator

To inject request body parameter, use `@BodyParam` decorator:

```typescript
@Post("/notes")
saveNote(@BodyParam("name") noteName: string, @BodyParam("note.text") text: string) { ... }
```

The parameter may be given as dot separated path, it will evaluate to null or undefined if last token can not be reached.

### 7.8. `@ContextObject` decorator

To inject directly the Context object, use `@ContextObject` decorator:

```typescript
@Post("/notes")
saveNote(@ContextObject() context: Context, @Body() note: Note) { ... }
```

### 7.9. `@ContextParam` decorator

```typescript
@Post("/notes")
saveNote(@ContextParam("auth.userId") userId: string, @Body() note: Note) { ... }
```

The parameter may be given as dot separated path, it will evaluate to null or undefined if last token can not be reached.

### 7.10. `@RequestObject` decorator

To inject directly the Request object, use `@ContextObject` decorator:

```typescript
@Post("/notes")
saveNote(@RequstObject() req: HttpRequest) { ... }
```

## 8. Authorization Decorators

Authorization decorators allow access control at service method level. At most one of the decorators should be specified, when none is present the method is not available to process any events.  

### 8.1. `@Public` decorator

Allow public access to the service method via HTTP decorated routes.

```typescript
@Public()
```

### 8.2. `@Private` decorator

Service method is only allowed to be called within the container. HTTP decorators should not be used in combination.

```typescript
@Private()
```

### 8.3. `@Internal` decorator

Proxy calls allowed only from services from the same application. HTTP decorators should not be used in combination.

```typescript
@Internal()
```

### 8.4. `@Remote` decorator

Remote proxy calls allowed from services of other applications. HTTP decorators should not be used in combination.

```typescript
@Remote()
```

### 8.5. `@Query` decorator

Method allowed only to specified roles. This decorator should used on methods retrieving data, in combination with HTTP decorators.

```typescript
@Query<R extends Roles>(roles: R)
```

### 8.6. `@Command` decorator

Method allowed only to specified roles. This decorator should used on methods manipulating data or having other side effects, in combination with HTTP decorators.

```typescript
@Command<R extends Roles>(roles: R)
```

### 8.7. `@Invoke` decorator

Method allowed only to specified roles. Use this decorator in cases when the user action fulfilled by the service method is neither query or command.

```typescript
@Invoke<R extends Roles>(roles: R)
```

The `Roles` interface defines the built-in reserved roles. When using `@Query`, `@Command` and `@Invoke` the reserved roles should not be explicitly specified, by default they are set as `Public: false`, `Internal: true`, `Remote: true`.

```typescript
export interface Roles {
    Public?: boolean;
    Internal?: boolean;
    Remote?: boolean;
    Application?: never;
    [role: string]: boolean;
}
```

## 9. Interfaces and Classes

### 9.1. Service

Services can implement the provided interface to provide implementation of life-cycle handlers `activate` and `release` as well as the logger instance. Before a service method corresponding to the Lambda triggering event is executed all services registered in the container that provide implementation of `activate` are invoked to prepare for event processing. At this point the service can initialize any resources or connections. After completion of the event processing `release` is called so services can dispose or close any resources or connections that were initialized in `activate` or in business logic of the service methods (lazy initialization). The service public API and implementation must not provide methods or properties with these names for other purposes.

```typescript
interface Service {
    log?: Logger;
    activate?(ctx?: Context): Promise<void>;
    release?(ctx?: Context): Promise<void>;
}
```

`BaseService` class is provided that initialize the logger in its constructor.

### 9.2. Proxy

The is a `Proxy` interface that simply extends `Service` without additional behavior. Implementation of proxies is supported by two classes, `BaseProxy` and `LambdaProxy`.

`BaseProxy` is intended as internal base class in the framework.

```typescript
abstract class BaseProxy implements Proxy {
    public readonly log: Logger;
    protected config: Configuration;
    protected security: Security;
    public initialize(config: Configuration, security: Security): void;
    protected proxy(method: Function, params: IArguments): Promise<any>;
    protected abstract token(req: RemoteRequest): Promise<string>;
    protected abstract invoke(req: RemoteRequest): Promise<any>;
}
```

`LambdaProxy` is implementation over AWS SDK support for Lambda function invocation.

```typescript
abstract class LambdaProxy extends BaseProxy {
    private lambda;
    constructor();
    protected token(req: RemoteRequest): Promise<string>;
    protected invoke(req: RemoteRequest): Promise<any>;
}
```

It is used in all of the provided examples, with following pattern:

```typescript
@Proxy(ExampleApi)
export class ExampleProxy extends LambdaProxy implements ExampleApi {
    public async serviceMethod(arg1: string, arg2: any): Promise<ReturnType> {
        return this.proxy(this.serviceMethod, arguments);
    }
}
```

### 9.3. Containers

Containers implement the following interface:

```typescript
interface Container {
    register(resource: Object, name?: string): this;
    register(service: Service): this;
    register(proxy: Proxy): this;
    register(type: Function, ...args: any[]): this;
    publish(service: Function, ...args: any[]): this;
    publish(service: Service): this;

    metadata(): ContainerMetadata;
    state(): ContainerState;
    prepare(): Container;

    httpRequest(req: HttpRequest): Promise<HttpResponse>;
    remoteRequest(req: RemoteRequest): Promise<any>;
    eventRequest(req: EventRequest): Promise<EventResult>;
}
```

`ContainerPool` is the base class for exposed container implementations `LambdaContainer` and `ExpressContainer`:

```typescript
class ContainerPool implements Container {
    // Only the additional members given

    protected log: Logger;

    constructor(application: string, name?: string);

    public config(): Configuration;
    public security(): Security;

    public dispose(): void;
}
```

`LambdaContainer` provides only an additional method to export the Lambda handler function:

```typescript
class LambdaContainer extends ContainerPool {
    constructor(applicationId: string);
    public export(): LambdaHandler;
}
```

`ExpressContainer` provides additional methods to `start` and `stop` the Express server; default port is 5000.

```typescript
class ExpressContainer extends ContainerPool {
    constructor(application: string, basePath?: string);
    start(port?: number): Server;
    stop(): void;
}
```

### 9.4. Configuration

The `Configuration` interface and the provided `BaseConfiguration` represent the built-in configuration service.

```typescript
interface Configuration {
    appId: string;
    stage: string;

    logLevel: LogLevel;
    resources: Record<string, string>;
    aliases: Record<string, string>;

    httpSecret: string;
    httpTimeout: string;
    internalSecret: string;
    internalTimeout: string;
    remoteTimeout: string;

    remoteSecret(appId: string): string;
    remoteStage(appId: string): string;
}
```

```typescript
abstract class BaseConfiguration implements Configuration {
    protected config: Record<string, any>;

    constructor(config?: Record<string, any>);
    public init(appId: string): void;

    public readonly appId: string;
    public readonly stage: string;
    
    public readonly logLevel: LogLevel;
    public readonly aliases: Record<string, string>;
    public readonly resources: Record<string, string>;

    public readonly httpSecret: string;
    public readonly httpTimeout: string;
    public readonly internalSecret: string;
    public readonly internalTimeout: string;
    public readonly remoteTimeout: string;

    public remoteSecret(appId: string): string;
    public remoteStage(appId: string): string;
}
```

### 9.5. Security

The `Security` interface and the provided `BaseSecurity` implement the TyX token based authorization. 

```typescript
interface Security extends Service {
    httpAuth(req: HttpRequest, permission: PermissionMetadata): Promise<Context>;
    remoteAuth(req: RemoteRequest, permission: PermissionMetadata): Promise<Context>;
    eventAuth(req: EventRequest, permission: PermissionMetadata): Promise<Context>;
    issueToken(req: IssueRequest): string;
}
```

```typescript
abstract class BaseSecurity implements Security {
    public readonly log: Logger;
    protected abstract config: Configuration;

    public httpAuth(req: HttpRequest, permission: PermissionMetadata): Promise<Context>;
    public remoteAuth(req: RemoteRequest, permission: PermissionMetadata): Promise<Context>;
    public eventAuth(req: EventRequest, permission: PermissionMetadata): Promise<Context>;
    public issueToken(req: IssueRequest): string;

    protected verify(requestId: string, token: string, permission: PermissionMetadata): Promise<Context>;
    protected secret(subject: string, issuer: string, audience: string): string;
    protected timeout(subject: string, issuer: string, audience: string): string;
}
```

### 9.6. Logger

The `Logger` interface in TyX is currently implemented to emit to `console`, in the future it is to be extended to use provided log writers as registered service.

`BaseService` creates a logger instance with `logName` being the service name and `emitter` the class name; these are part of the log lines emitted to console. When the service is implemented as multiple classes or scripts `emitter` is to identify where the log entries originate from.

```typescript
enum LogLevel {
    ALL = 0,
    TRACE = 0,
    DEBUG = 1,
    INFO = 2,
    WARN = 3,
    ERROR = 4,
    FATAL = 5,
    OFF = 6,
}
namespace LogLevel {
    function bellow(level: LogLevel): boolean;
    function set(level: LogLevel): void;
}

interface Logger {
    todo(message: any, ...args: any[]): void;
    fatal(message: any, ...args: any[]): any;
    error(message: any, ...args: any[]): any;
    info(message: any, ...args: any[]): void;
    warn(message: any, ...args: any[]): void;
    debug(message: any, ...args: any[]): void;
    trace(message: any, ...args: any[]): void;
    time(): [number, number];
    timeEnd(start: [number, number], message: any, ...args: any[]): void;
}
namespace Logger {
    const sys: Logger;
    function get(logName: string, emitter?: any): Logger;
}
```

> TODO: Logger example

### 9.7. Express Service

See example [2.6. Express service](#26-express-service).

```typescript
abstract class ExpressService extends BaseService {
    protected process(ctx: Context, req: HttpRequest): Promise<HttpResponse>;
    protected abstract setup(app: Express, ctx: Context, req: HttpRequest): void;
    public release(): Promise<void>;
}
```