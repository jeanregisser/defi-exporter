import { FastifyRequest } from "fastify";
import { getMetrics } from "../utils";
import { fetchBalance } from "./client";
import { NAMESPACE } from "./consts";

type CustomRequest = FastifyRequest<{
  Querystring: { address: any };
}>;

namespace ZapperUniswapV2Response {
  export interface Root {
    [address: string]: Address[] | undefined;
  }

  export interface Address {
    address: string;
    tokenAddress: string;
    exchangeAddress: string;
    contractAddress: string;
    value: string;
    label: string;
    symbol: string;
    protocol: string;
    protocolDisplay: string;
    protocolSymbol: string;
    balance: number;
    balanceUSD: number;
    tokens: Token[];
    share: number;
    supply: number;
    pricePerToken: number;
    canStake: boolean;
    isBlocked: boolean;
    lpRewards?: LpRewards;
    rewardAddress?: string;
    stakedBalance?: number;
    rewardBalance?: number;
    rewardBalanceUSD?: number;
    rewardToken?: string;
    isStaked?: boolean;
  }

  export interface Token {
    address: string;
    symbol: string;
    reserve: number;
    price: number;
    balance: number;
    balanceUSD: number;
    noImage?: boolean;
  }

  export interface LpRewards {
    name: string;
    contractAddress: string;
    rewardAddress: string;
    rewardTokenAddress: string;
    canStake: boolean;
    rewardToken: string;
    abi: Abi[];
    methods: Methods;
  }

  export interface Abi {
    inputs: Input[];
    payable?: boolean;
    stateMutability?: string;
    type: string;
    anonymous?: boolean;
    name?: string;
    signature?: string;
    constant?: boolean;
    outputs?: Output[];
  }

  export interface Input {
    indexed?: boolean;
    internalType: string;
    name: string;
    type: string;
  }

  export interface Output {
    internalType: string;
    name: string;
    type: string;
  }

  export interface Methods {
    balance: string;
    stake: string;
    claim: string;
    exit: string;
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

  const addressData = (rawData[address] || []).filter((val) => val.balance > 0);

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
