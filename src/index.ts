import fastify from "fastify";
import { feesWtfHandler } from "./feesWtf";
import { apyVisionHandler } from "./apyVision";
import { poolsVisionHandler } from "./poolsVision";
import { zapperHandler } from "./zapper/zapper";

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

server.listen(port, address, (err) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  server.log.info(`Routes:\n${server.printRoutes()}`);
});
