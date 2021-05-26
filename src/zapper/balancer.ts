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
    products: Product[];
    meta: Meta[];
  }

  export interface Product {
    label: string;
    assets: Asset[];
    meta: any[];
  }

  export interface Asset {
    type: string;
    category: string;
    address: string;
    tokenAddress: string;
    decimals: number;
    symbol: string;
    label: string;
    share: number;
    supply: number;
    protocol: string;
    protocolDisplay: string;
    protocolSymbol: string;
    price: number;
    balance: number;
    balanceRaw: string;
    balanceUSD: number;
    tokens: Token[];
  }

  export interface Token {
    price: number;
    address: string;
    decimals: number;
    symbol: string;
    reserve: number;
    balance: number;
    balanceUSD: number;
    weight: number;
    isCToken: boolean;
  }

  export interface Meta {
    label: string;
    value: number;
    type: string;
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

  const addressData = rawData[address]!.products.flatMap((product) =>
    product.assets.filter((asset) => asset.type === "pool")
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
