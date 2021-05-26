import { FastifyRequest } from "fastify";
import { getMetrics } from "../utils";
import { fetchBalance } from "./client";
import { NAMESPACE } from "./consts";

type CustomRequest = FastifyRequest<{
  Querystring: { address: any };
}>;

namespace ZapperTokenSetsResponse {
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
    address: string;
    symbol: string;
    decimals: number;
    label: string;
    img: string;
    price: number;
    type: string;
    category: string;
    protocol: string;
    protocolDisplay: string;
    protocolSymbol: string;
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

export async function zapperTokenSetsHandler(req: CustomRequest) {
  const { address } = req.query;
  if (!address || typeof address !== "string") {
    throw new Error("Address is required");
  }

  const rawData = await fetchBalance<ZapperTokenSetsResponse.Root>(
    "tokensets",
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
      label: "name",
    },
  });

  return metrics.join("\n");
}
