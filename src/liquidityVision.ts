import { Request, Response } from "express";
import BigNumber from "bignumber.js";
import snakeCase from "lodash.snakecase";
import mapValues from "lodash.mapvalues";
import got from "got";
import { formatPrometheusLabels } from "./utils";

namespace LiquidityVisionResponse {
  export interface Root {
    address: string;
    totalValueUsd: number;
    totalFeeUsd: number;
    netGainUsd: number;
    netGainPct: number;
    pairInfos: PairInfo[];
    priceLastUpdated: number;
  }

  export interface PairInfo {
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
  }

  export interface Tx {
    blockNumber: number;
    type: string;
    amount: number;
    address: string;
    transactionHash: string;
    burnOrMintResult?: BurnOrMintResult;
    contractName: string;
  }

  export interface BurnOrMintResult {
    amountsMap: AmountsMap;
    amounts: Amounts;
    prices: Prices;
    isBurn: boolean;
    gasUsed: number;
    usdValueAtBlock: number;
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

function parseNumericValue(value: string) {
  return new BigNumber(value).toString();
}

function convertToPromMetricName(value: string) {
  return `liquidityvision_${snakeCase(value).replace("_h_", "h_")}`;
}

export async function liquidityVisionHandler(req: Request, res: Response) {
  const { address } = req.query;
  if (!address || typeof address !== "string") {
    throw new Error("Address is required");
  }
  const url = `https://api.liquidity.vision/portfolio/${address}`;

  const rawData: LiquidityVisionResponse.Root = await got(url).json();

  // console.log("==result", rawData);

  const summaryMetrics = getMetrics(rawData, {
    keys: ["totalValueUsd", "totalFeeUsd", "netGainUsd", "netGainPct"],
    labels: { address },
  });

  const poolsMetrics = getMetrics(rawData.pairInfos, {
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

  // console.log("==done");

  res.send(promMetrics.join("\n"));
}

type MetricsOptions<T> = {
  keys: Array<keyof T>;
  labels: Record<string, string>;
  labelKeys?: Array<keyof T>;
  labelMappings?: Partial<Record<keyof T, string>>;
};

function getMetrics<T>(val: T | T[], options: MetricsOptions<T>) {
  if (Array.isArray(val)) {
    return getMetricsFromArray(val, options);
  }

  return getMetricsFromObject(val, options);
}

function getMetricsFromArray<T>(arr: T[], options: MetricsOptions<T>) {
  return arr.flatMap((val) => getMetricsFromObject(val, options));
}

function getMetricsFromObject<T>(
  val: T,
  { keys, labels, labelKeys, labelMappings }: MetricsOptions<T>
) {
  const dynamicLabels: Record<string, any> = {};

  const allLabelKeys = new Set<keyof T>([
    ...(labelKeys ?? []),
    ...(Object.keys(labelMappings ?? {}) as Array<keyof T>),
  ]);
  allLabelKeys.forEach((key) => {
    const labelName = labelMappings?.[key] || key;
    dynamicLabels[labelName as string] = val[key];
  });
  const formattedLabels = formatPrometheusLabels({
    ...dynamicLabels,
    ...labels,
  });

  const keysSet = new Set(keys);
  return Object.entries(val).map(([key, value]) => {
    if (!keysSet.has(key as keyof T)) {
      return null;
    }
    const formattedKey = convertToPromMetricName(key);
    return `${formattedKey}\{${formattedLabels}\} ${value}`;
  });
}
