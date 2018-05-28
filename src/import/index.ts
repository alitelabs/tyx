import * as Aws from "./aws";
import * as Express from "./express";
import * as GraphQL from "./graphql";
import * as Di from "./typedi";
import * as Orm from "./typeorm";

export const Imports = [
    Di,
    Orm,
    Aws,
    Express,
    GraphQL
];

export {
    Di,
    Orm,
    Aws,
    Express,
    GraphQL
};