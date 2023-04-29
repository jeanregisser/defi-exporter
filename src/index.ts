import fastify from "fastify";
import feesWtf from "./feesWtf";
import apyVision from "./apyVision";
import poolsVision from "./poolsVision";
import zapper from "./zapper/zapper";
import theCelo from "./thecelo";
import coinGecko from "./coingecko";

const port = process.env.PORT || 3000;
const address = process.env.NODE_ENV !== "production" ? "localhost" : "::";

const server = fastify({
  logger: {
    ...(process.env.NODE_ENV !== "production" && {
      transport: {
        target: "pino-pretty",
      },
    }),
  },
  ajv: {
    customOptions: {
      // The Ajv default configuration in Fastify doesn't support coercing array parameters in querystring.
      // This will coerce one parameter to a single element in array
      // Example: http://localhost:3000/?ids=1 will be accepted when ids is expected to be an array
      coerceTypes: "array",
    },
  },
});

server.register(poolsVision);
server.register(apyVision);
server.register(feesWtf);
server.register(zapper);
server.register(theCelo);
server.register(coinGecko);

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
