import * as Aws from "./aws";
import * as Express from "./express";
import * as GraphQL from "./graphql";
import * as Orm from "./typeorm";

export const Imports = [
    Orm,
    Aws,
    Express,
    GraphQL
];

export {
    Orm,
    Aws,
    Express,
    GraphQL
};