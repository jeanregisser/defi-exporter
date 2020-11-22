import fastify from "fastify";
import { feesWtfHandler } from "./feesWtf";
import { apyVisionHandler } from "./apyVision";
import { poolsVisionHandler } from "./poolsVision";

const port = process.env.PORT || 3000;

const server = fastify({
  logger: {
    prettyPrint: process.env.NODE_ENV !== "production",
  },
});

server.get("/poolsVision", poolsVisionHandler);
server.get("/apyVision", apyVisionHandler);
server.get("/feesWtf", feesWtfHandler);

server.listen(port, (err) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  server.log.info(`Routes:\n${server.printRoutes()}`);
});
