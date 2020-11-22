import { FastifyRequest } from "fastify";
import { getMetrics } from "../utils";
import { fetchBalance } from "./client";
import { NAMESPACE } from "./consts";

type CustomRequest = FastifyRequest<{
  Querystring: { address: any };
}>;

namespace ZapperBalancerResponse {
  export interface Root {
    [address: string]: Address | undefined;
  }

  export interface Address {
    pools: Pool[];
    claimable: any[];
  }

  export interface Pool {
    protocol: string;
    protocolDisplay: string;
    protocolSymbol: string;
    address: string;
    contractAddress: string;
    tokenAddress: string;
    exchangeAddress: string;
    symbol: string;
    label: string;
    balance: number;
    share: number;
    supply: number;
    tokens: Token[];
    balanceUSD: number;
    pricePerToken: number;
    canStake: boolean;
    isBlocked: boolean;
    isStaked: boolean;
  }

  export interface Token {
    price: number;
    address: string;
    symbol: string;
    reserve: string;
    balance: number;
    balanceUSD: number;
    weight: number;
    isCToken: boolean;
  }
}

export async function zapperBalancerHandler(req: CustomRequest) {
  const { address } = req.query;
  if (!address || typeof address !== "string") {
    throw new Error("Address is required");
  }

  const rawData = await fetchBalance<ZapperBalancerResponse.Root>(
    "balancer",
    address
  );

  const addressData = (rawData[address]?.pools || []).filter(
    (val) => val.balance > 0
  );

  const metrics = getMetrics(addressData, {
    namespace: NAMESPACE,
    keys: ["balance", "balanceUSD"],
    labels: { address },
    // labelKeys: ["poolProviderName", "name", "address"],
    labelMappings: {
      tokenAddress: "poolAddress",
      symbol: "poolName",
    },
  });

  return metrics.join("\n");
}
