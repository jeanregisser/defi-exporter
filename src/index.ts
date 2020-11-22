import fastify from "fastify";
import { feesWtfHandler } from "./feesWtf";
import { liquidityVisionHandler } from "./liquidityVision";
import { poolsVisionHandler } from "./poolsVision";

const port = process.env.PORT || 3000;

const server = fastify({
  logger: true,
});

server.get("/poolsVision", poolsVisionHandler);
server.get("/liquidityVision", liquidityVisionHandler);
server.get("/feesWtf", feesWtfHandler);

server.listen(port, (err) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  // console.log(`Server listening at ${address}`);
});
