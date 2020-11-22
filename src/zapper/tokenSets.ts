import { FastifyRequest } from "fastify";
import { getMetrics } from "../utils";
import { fetchBalance } from "./client";
import { NAMESPACE } from "./consts";

type CustomRequest = FastifyRequest<{
  Querystring: { address: any };
}>;

namespace ZapperTokenSetsResponse {
  export interface Root {
    [address: string]: TokenSet[] | undefined;
  }

  export interface TokenSet {
    label: string;
    img: string;
    balance: number;
    balanceUSD: number;
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

  const addressData = (rawData[address] || []).filter((val) => val.balance > 0);

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
