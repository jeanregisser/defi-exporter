import { FastifyPluginAsync, FastifyRequest } from "fastify";
import got from "got";
import { getMetrics } from "./utils";

const NAMESPACE = "apyvision";

type CustomRequest = FastifyRequest<{
  Querystring: { address: any };
}>;

namespace ApyVisionResponse {
  export interface Root {
    address: string;
    totalValueUsd: number;
    totalFeeUsd: number;
    netGainUsd: number;
    netGainPct: number;
    userPools: UserPool[];
    priceLastUpdated: number;
    message: any;
    allowDownload: boolean;
  }

  export interface UserPool {
    poolProviderName: string;
    name: string;
    address: string;
    totalLpTokens: number;
    ownedLpTokensPct: number;
    mintBurntLedgerLpTokens: number;
    currentOwnedLpTokens: number;
    lpTokenUsdPrice: number;
    totalValueUsd: number;
    initialCapitalValueUsd: number;
    totalFeeUsd: number;
    tokens: Token[];
    netGainUsd: number;
    netGainPct: number;
    txs: Tx[];
  }

  export interface Token {
    tokenAddress: string;
    tokenName: string;
    tokenStartingBalance: number;
    tokenCurrentBalance: number;
    tokenCurrentPrice: number;
    tokenUsdGain: number;
    averageWeightedExecutedPrice: number;
  }

  export interface Tx {
    blockNumber: number;
    type: string;
    amount: number;
    address: string;
    transactionHash: string;
    burnOrMintResult?: BurnOrMintResult;
    contractName: string;
    gasUsed: number;
    gasUsedUsd: number;
  }

  export interface BurnOrMintResult {
    amountsMap: AmountsMap;
    amounts: Amounts;
    prices: Prices;
    isBurn: boolean;
    usdValueAtBlock: number;
    lpTokenPrice: number;
  }

  export interface AmountsMap {}

  export interface Amounts {
    BAL?: number;
    WETH: number;
    WBTC?: number;
    UNI?: number;
  }

  export interface Prices {
    BAL?: number;
    WETH: number;
    WBTC?: number;
    UNI?: number;
  }
}

async function apyVisionHandler(req: CustomRequest) {
  const { address } = req.query;
  if (!address || typeof address !== "string") {
    throw new Error("Address is required");
  }
  const url = `https://api.apy.vision/portfolio/1/core/${address}`;

  const rawData: ApyVisionResponse.Root = await got(url).json();

  // req.log.info("==result", rawData);

  const summaryMetrics = getMetrics(rawData, {
    namespace: NAMESPACE,
    keys: ["totalValueUsd", "totalFeeUsd", "netGainUsd", "netGainPct"],
    labels: { address },
  });

  const poolsMetrics = getMetrics(rawData.userPools, {
    namespace: NAMESPACE,
    keys: [
      "totalValueUsd",
      "initialCapitalValueUsd",
      "totalFeeUsd",
      "netGainUsd",
      "netGainPct",
    ],
    labels: { address },
    // labelKeys: ["poolProviderName", "name", "address"],
    labelMappings: {
      poolProviderName: "poolProvider",
      name: "poolName",
      address: "poolAddress",
    },
  });

  const promMetrics = [...summaryMetrics, ...poolsMetrics];

  // req.log.info("==done");

  return promMetrics.join("\n");
}

const handler: FastifyPluginAsync = async (fastify, options) => {
  fastify.get("/apyVision", apyVisionHandler);
};

export default handler;
