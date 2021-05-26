import { FastifyRequest } from "fastify";
import { getMetrics } from "../utils";
import { fetchBalance } from "./client";
import { NAMESPACE } from "./consts";

type CustomRequest = FastifyRequest<{
  Querystring: { address: any };
}>;

namespace ZapperYearnResponse {
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
    decimals: number;
    tokenAddress: string;
    contractAddress: string;
    symbol: string;
    label: string;
    img: string;
    protocolDisplay: string;
    protocolSymbol: string;
    protocol: string;
    balance: number;
    balanceRaw: string;
    balanceUSD: number;
    price: number;
    pricePerShare: number;
    canDeposit: boolean;
    tokens: Token[];
  }

  export interface Token {
    address: string;
    symbol: string;
    decimals: number;
    img: string;
    balance: number;
    balanceUSD: number;
  }

  export interface Meta {
    label: string;
    value: number;
    type: string;
  }
}

export async function zapperYearnHandler(req: CustomRequest) {
  const { address } = req.query;
  if (!address || typeof address !== "string") {
    throw new Error("Address is required");
  }

  const rawData = await fetchBalance<ZapperYearnResponse.Root>(
    "yearn",
    address
  );

  const addressData = rawData[address]!.products.flatMap(
    (product) => product.assets
  );

  const metrics = getMetrics(addressData, {
    namespace: NAMESPACE,
    keys: ["balance", "balanceUSD"],
    labels: { address },
    // labelKeys: ["poolProviderName", "name", "address"],
    labelMappings: {
      tokenAddress: "tokenAddress",
      label: "name",
    },
  });

  return metrics.join("\n");
}
