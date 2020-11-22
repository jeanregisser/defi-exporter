import { FastifyRequest } from "fastify";
import { getMetrics } from "../utils";
import { fetchBalance } from "./client";
import { NAMESPACE } from "./consts";

type CustomRequest = FastifyRequest<{
  Querystring: { address: any };
}>;

namespace ZapperYearnResponse {
  export interface Root {
    [address: string]: Address[] | undefined;
  }

  export interface Address {
    symbol: string;
    label: string;
    img: string;
    protocolImg: string;
    protocol: string;
    protocolDisplay: string;
    protocolSymbol: string;
    underlyingSymbol: string;
    vaultToken: string;
    address: string;
    contractAddress: string;
    tokenAddress: string;
    isVault: boolean;
    isBlocked: boolean;
    canStake: boolean;
    canDeposit: boolean;
    balance: number;
    balanceUSD: number;
  }
}

export async function zapperYearnHandler(req: CustomRequest) {
  const { address } = req.query;
  if (!address || typeof address !== "string") {
    throw new Error("Address is required");
  }

  const rawData = await fetchBalance<ZapperYearnResponse.Root>(
    "iearn",
    address
  );

  const addressData = (rawData[address] || []).filter((val) => val.balance > 0);

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
