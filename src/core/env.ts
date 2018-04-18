import "reflect-metadata";

if (Symbol["asyncIterator"] === undefined) ((Symbol as any)["asyncIterator"]) = Symbol.for("asyncIterator");

process.on("unhandledRejection", (e) => {
  console.log(e);
});
