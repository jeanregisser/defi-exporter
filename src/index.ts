import fastify from "fastify";
import { feesWtfHandler } from "./feesWtf";
import { apyVisionHandler } from "./apyVision";
import { poolsVisionHandler } from "./poolsVision";
import { zapperHandler } from "./zapper/zapper";
import { theCeloHandler } from "./thecelo";
import { coinGeckoHandler } from "./coingecko";

const port = process.env.PORT || 3000;
const address = process.env.NODE_ENV !== "production" ? "localhost" : "::";

const server = fastify({
  logger: {
    prettyPrint: process.env.NODE_ENV !== "production",
  },
});

server.get("/poolsVision", poolsVisionHandler);
server.get("/apyVision", apyVisionHandler);
server.get("/feesWtf", feesWtfHandler);
server.get("/zapper", zapperHandler);
server.get("/thecelo", theCeloHandler);
server.get("/coingecko", coinGeckoHandler);

// @ts-ignore
const originalErrorHandler = server.errorHandler;

server.setErrorHandler(function (error, request, reply) {
  // Augment error object so the url from got is logged too (options is not enumerable and not logged by default)
  // @ts-ignore
  if (error?.options?.url) {
    // @ts-ignore
    error.url = error.options.url;
  }

  return originalErrorHandler(error, request, reply);
});

server.listen(port, address, (err) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  server.log.info(`Routes:\n${server.printRoutes()}`);
});
