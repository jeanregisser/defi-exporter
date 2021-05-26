import { FastifyRequest } from "fastify";
import { getMetrics } from "../utils";
import { fetchBalance } from "./client";
import { NAMESPACE } from "./consts";

type CustomRequest = FastifyRequest<{
  Querystring: { address: any };
}>;

namespace ZapperUniswapV2Response {
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
    label: string;
    symbol: string;
    protocol: string;
    protocolDisplay: string;
    protocolSymbol: string;
    balance: number;
    balanceRaw: string;
    balanceUSD: number;
    tokens: Token[];
    share: number;
    supply: number;
    price: number;
  }

  export interface Token {
    address: string;
    decimals: number;
    symbol: string;
    reserve: number;
    price: number;
    balance: number;
    balanceUSD: number;
    noImage: boolean;
  }

  export interface Meta {
    label: string;
    value: number;
    type: string;
  }
}

export async function zapperUniswapV2Handler(req: CustomRequest) {
  const { address } = req.query;
  if (!address || typeof address !== "string") {
    throw new Error("Address is required");
  }
  const rawData = await fetchBalance<ZapperUniswapV2Response.Root>(
    "uniswap-v2",
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
