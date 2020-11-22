import { FastifyRequest } from "fastify";
import { zapperBalancerHandler } from "./balancer";
import { zapperCurveHandler } from "./curve";
import { zapperTokensHandler } from "./tokens";
import { zapperTokenSetsHandler } from "./tokenSets";
import { zapperUniswapV2Handler } from "./uniswapV2";
import { zapperYearnHandler } from "./yearn";

type CustomRequest = FastifyRequest<{
  Querystring: { address: any };
}>;

export async function zapperHandler(req: CustomRequest) {
  const result = await Promise.all([
    zapperTokensHandler(req),
    zapperUniswapV2Handler(req),
    zapperBalancerHandler(req),
    zapperTokenSetsHandler(req),
    zapperCurveHandler(req),
    zapperYearnHandler(req),
  ]);

  return result.join("\n");
}
