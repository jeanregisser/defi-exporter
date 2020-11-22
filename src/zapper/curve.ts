import { FastifyRequest } from "fastify";
import { getMetrics } from "../utils";
import { fetchBalance } from "./client";
import { NAMESPACE } from "./consts";

type CustomRequest = FastifyRequest<{
  Querystring: { address: any };
}>;

namespace ZapperCurveResponse {
  export interface Root {
    [address: string]: Address[] | undefined;
  }

  export interface Address {
    protocol: string;
    protocolSymbol: string;
    protocolDisplay: string;
    label: string;
    name: string;
    symbol: string;
    address: string;
    exchangeAddress: string;
    gaugeAddress: string;
    tokenAddress: string;
    proxyAddress: string;
    depositAddress: string;
    canStake: boolean;
    isStaked: boolean;
    isBlocked: boolean;
    stakedBalance: number;
    rewardBalance: number;
    pricePerToken: number;
    share: number;
    balance: number;
    balanceUSD: number;
    supply: number;
    tokens: Token[];
  }

  export interface Token {
    address: string;
    symbol: string;
    balance: number;
    balanceUSD: number;
    reserve: number;
    yPrice: number;
    price: number;
  }
}

export async function zapperCurveHandler(req: CustomRequest) {
  const { address } = req.query;
  if (!address || typeof address !== "string") {
    throw new Error("Address is required");
  }

  const rawData = await fetchBalance<ZapperCurveResponse.Root>(
    "curve",
    address
  );

  const addressData = (rawData[address] || []).filter((val) => val.balance > 0);

  const metrics = getMetrics(addressData, {
    namespace: NAMESPACE,
    keys: ["balance", "balanceUSD"],
    labels: { address },
    // labelKeys: ["poolProviderName", "name", "address"],
    labelMappings: {
      address: "poolAddress",
      symbol: "poolName",
    },
  });

  return metrics.join("\n");
}
