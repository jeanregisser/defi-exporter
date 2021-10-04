import { FastifyRequest } from "fastify";
import { getMetrics } from "../utils";
import { fetchBalance, fetchSupportedBalances } from "./client";
import { NAMESPACE } from "./consts";

type CustomRequest = FastifyRequest<{
  Querystring: { address: any };
}>;

// Generic balance response (different protocols have more fields
namespace ZapperBalanceResponse {
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

export async function zapperHandler(req: CustomRequest) {
  const { address } = req.query;
  if (!address || typeof address !== "string") {
    throw new Error("Address is required");
  }

  const supportedBalances = await fetchSupportedBalances(address);

  const promises = [];

  for (const { network, apps } of supportedBalances) {
    for (const { appId } of apps) {
      promises.push(
        (async () => {
          const rawData = await fetchBalance<ZapperBalanceResponse.Root>(
            appId,
            address,
            network
          );

          const addressData = rawData[address]!.products.flatMap(
            (product) => product.assets
          );

          const metrics = getMetrics(addressData, {
            namespace: NAMESPACE,
            keys: ["balance", "balanceUSD"],
            labels: { network, appId, address },
            labelMappings: {
              address: "assetAddress",
              symbol: "assetName",
              type: "assetType",
            },
          });

          return metrics.join("\n");
        })()
      );
    }
  }

  const result = await Promise.all(promises);

  return result.join("\n");
}
