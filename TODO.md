# TODO

## Design
 - [ ] Unified field / http param declarations
 - [ ] Support for @Arg() -> multiple input args, GraphQL
 - [ ] Support abstract services
 - [ ] Convention (ctx, req) or (req, ctx) !!!
 - [ ] Support Service/Type, Configuration
 - [ ] Wording of all TypeError
 - [ ] Exception response, configurable to have stack trace
 - [ ] Core.init(+config: object)
 - [ ] Application concept ???
 - [ ] Move Database connections out of core
 - [ ] Split on core and orm

## Container
 - [ ] Publish API only if there is a service implementation
 - [ ] Use Api class in inject (proxy)
 - [ ] Global proxy
 - [ ] Api Service suffix removal

## Inheritance
 - [x] Inline API inheritance
 - [x] Service inheritance
 - [x] Inheritance of HTTP bindings
 - [x] Validate Service has handlers for all Api methods
 - [x] Explicit @Override

## Metadata
 - [ ] Repository validation, no uncommited Api, Service ....
 - [x] Core as array of all instances, 
 - [ ] Core info configuration
 - [ ] Core info statistics ... (method invokes, time, code size, num instances)
 - [x] Remove adapter functions from http and event decorators
 - [x] Metdata.decorate to return a decorator function
 - [x] Api methods throw undefined

## Runtime
 - [x] Integrate wtfnode in error log
 - [ ] Add Logger.debug log ... startup ...

## Other
 - [ ] TypeOrm always drop keys, anything wrong with tyx decorator wrappers?
 - [ ] Startup time impact of GraphQL
 - [ ] Performance https://www.smashingmagazine.com/2018/06/nodejs-tools-techniques-performance-servers/
 - [ ] Do test with Core.init()
 - [x] What is wrong with Playground ???
 - [x] Make it work with Serverless offline API Gateway !
 - [ ] Why GraphQL does not return syntax error details
 - [ ] Upgrade to new Lambda request types ...
 - [ ] Extend CoreInfo schema with statistics ...

## 2018
 - [x] Rename Query nodes, sufix: Expr, Record
 - [x] Version upgrade of graphiql tools
 - [x] Api method required args
 - [ ] On Core.init send roles map for GraphQL (options object)
 - [ ] Database connect timeout, no error?
 - [x] Proxies available as service
 - [ ] ManyToMany resolver
 - [ ] Optional reverse side in relations
 - [ ] Move configuration into encrypted store

 