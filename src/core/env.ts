import "reflect-metadata";

process.on("unhandledRejection", (e) => {
  console.log(e);
});
