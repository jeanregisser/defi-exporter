import { FastifyRequest } from "fastify";
import { getMetrics } from "../utils";
import { fetchBalance } from "./client";
import { NAMESPACE } from "./consts";

type CustomRequest = FastifyRequest<{
  Querystring: { address: any };
}>;

namespace ZapperCurveResponse {
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
    share: number;
    supply: number;
    tokens: Token[];
    protocol: string;
    protocolSymbol: string;
    protocolDisplay: string;
    price: number;
    balance: number;
    balanceRaw: string;
    balanceUSD: number;
  }

  export interface Token {
    decimals: number;
    address: string;
    symbol: string;
    balance: number;
    balanceUSD: number;
    reserve: number;
    price: number;
  }

  export interface Meta {
    label: string;
    value: number;
    type: string;
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

  const addressData = rawData[address]!.products.flatMap((product) =>
    product.assets.filter((asset) => asset.type === "pool")
  );

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
