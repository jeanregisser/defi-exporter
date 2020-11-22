import { FastifyRequest } from "fastify";
import { getMetrics } from "../utils";
import { fetchBalance } from "./client";
import { NAMESPACE } from "./consts";

type CustomRequest = FastifyRequest<{
  Querystring: { address: any };
}>;

namespace ZapperTokensResponse {
  export interface Root {
    [address: string]: Address[] | undefined;
  }

  export interface Address {
    address: string;
    tokenAddress: string;
    decimals: number;
    img: string;
    label: string;
    symbol: string;
    balance: number;
    balanceRaw: string;
    balanceUSD: number;
    price: number;
    isStaked: boolean;
    canStake: boolean;
    hide: boolean;
    canExchange: boolean;
    lpRewards?: LpRewards;
    protocolImg?: string;
    stakedBalance?: number;
    stakedBalanceRaw?: string;
    stakedBalanceUSD?: number;
    rewardBalance?: number;
    rewardBalanceRaw?: string;
    rewardBalanceUSD?: number;
    rewardToken?: string;
  }

  export interface LpRewards {
    name: string;
    protocol: string;
    protocolImg: string;
    contractAddress: string;
    rewardAddress: string;
    rewardTokenAddress: string;
    canStake: boolean;
    rewardToken: string;
    abi: Abi[];
    isGeyser?: boolean;
    methods: Methods;
    isSingleToken?: boolean;
  }

  export interface Abi {
    constant?: boolean;
    inputs: Input[];
    name: string;
    outputs?: Output[];
    payable?: boolean;
    stateMutability?: string;
    type: string;
    signature: string;
    anonymous?: boolean;
  }

  export interface Input {
    name: string;
    type: string;
    indexed?: boolean;
    internalType?: string;
  }

  export interface Output {
    name: string;
    type: string;
    internalType?: string;
  }

  export interface Methods {
    balance: string;
    earn: string;
    stake: string;
    claim: string;
    exit: string;
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

  const addressData = (rawData[address] || []).filter((val) => val.balance > 0);

  const metrics = getMetrics(addressData, {
    namespace: NAMESPACE,
    keys: ["balance", "balanceUSD"],
    labels: { address },
    // labelKeys: ["poolProviderName", "name", "address"],
    labelMappings: {
      tokenAddress: "tokenAddress",
      symbol: "tokenName",
    },
  });

  return metrics.join("\n");
}
