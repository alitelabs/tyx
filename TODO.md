# TODO

## Design
 - [ ] Unified field / http param declarations
 - [ ] Support for @Arg() -> multiple input args, GraphQL
 - [ ] Support abstract services
 - [ ] Convention (ctx, req) or (req, ctx) !!! ==> (obj?, ...args, ctx?, info?)
 - [ ] Support Service&Type, Configuration ...
 - [ ] !! Final solution for @Extension
 - [ ] Wording of all TypeError
 - [ ] Exception response, configurable to have stack trace
 - [ ] Core.init(+config: object) instead of individual params
 - [ ] Application concept ???
 - [x] Move Database connections out of core in providers
 - [x] Make typeorm an peer dependecy
 - [ ] Fallback code for proxy if no local service
 - [ ] Save tyx.context in CoreInstance, as thread local variable
 - [x] Remove design from method
 - [ ] Logger injection
 - [ ] Complete Utils.reload() -> Core.reload()
 - [ ] Allow @Type to extend @Input and the oposite, when required to declare the same struc twice
 - [ ] Action / Claim based security

## Container
 - [x] Publish API only if there is a service implementation
 - [X] Use Api class in inject (proxy) instead of alias
 - [x] Use Api class as global proxy
 - [ ] Api Service suffix removal
 - [x] Initialize services on instance creation

 ## Runtime
 - [ ] Error handling and logging, too many throw this.log.error(...)
 - [ ] Error on activate() and release()
 - [x] Integrate wtfnode in error log
 - [ ] Optimize apiRequest, for local Api proxy instances
 - [ ] Add Logger.debug log ... startup ...
 - [ ] Solve Context circular refernce problem, for logging
 - [ ] Lambda proxy behaviour on 501, exception in general

## Metadata
 - [ ] Repository validation, no uncommited Api, Service ....
 - [x] Core as array of all instances, 
 - [ ] Core info add configuration, replace process.env.XX in code with static methods
 - [ ] Core info statistics ... (method invokes, time, code size, num instances)
 - [x] Remove adapter functions from http and event decorators
 - [x] Metdata.decorate to return a decorator function
 - [x] Api methods throw undefined

## Inheritance
 - [x] Inline API inheritance
 - [x] Service inheritance
 - [x] Inheritance of HTTP bindings
 - [x] Validate Service has handlers for all Api methods
 - [x] Explicit @Override

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

 