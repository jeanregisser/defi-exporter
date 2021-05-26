import { FastifyRequest } from "fastify";
import { getMetrics } from "../utils";
import { fetchBalance } from "./client";
import { NAMESPACE } from "./consts";

type CustomRequest = FastifyRequest<{
  Querystring: { address: any };
}>;

namespace ZapperTokensResponse {
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
    symbol: string;
    decimals: number;
    label: string;
    img: string;
    hide: boolean;
    canExchange: boolean;
    price: number;
    balance: number;
    balanceRaw: string;
    balanceUSD: number;
  }

  export interface Meta {
    label: string;
    value: number;
    type: string;
  }
}

export async function zapperTokensHandler(req: CustomRequest) {
  const { address } = req.query;
  if (!address || typeof address !== "string") {
    throw new Error("Address is required");
  }

  const rawData = await fetchBalance<ZapperTokensResponse.Root>(
    "tokens",
    address
  );

  const addressData = rawData[address]!.products[0].assets;

  const metrics = getMetrics(addressData, {
    namespace: NAMESPACE,
    keys: ["balance", "balanceUSD"],
    labels: { address },
    // labelKeys: ["poolProviderName", "name", "address"],
    labelMappings: {
      address: "tokenAddress",
      symbol: "tokenName",
    },
  });

  return metrics.join("\n");
}
