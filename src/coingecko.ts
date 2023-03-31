import BigNumber from "bignumber.js";
import { FastifyPluginAsync, FastifyRequest } from "fastify";
import got from "got";
import { getMetrics, parseNumericValue } from "./utils";

const NAMESPACE = "coingecko";

const PAGE_COUNT = 3;
const PER_PAGE = 250; // current max accepted by coingecko

namespace CoinGeckoResponse {
  export type Root = Item[];

  export interface Item {
    id: string;
    symbol: string;
    name: string;
    image: string;
    current_price: number;
    market_cap: number;
    market_cap_rank: number;
    fully_diluted_valuation?: number;
    total_volume: number;
    high_24h: number;
    low_24h: number;
    price_change_24h: number;
    price_change_percentage_24h: number;
    market_cap_change_24h: number;
    market_cap_change_percentage_24h: number;
    circulating_supply: number;
    total_supply?: number;
    max_supply?: number;
    ath: number;
    ath_change_percentage: number;
    ath_date: string;
    atl: number;
    atl_change_percentage: number;
    atl_date: string;
    roi?: Roi;
    last_updated: string;
    price_change_percentage_14d_in_currency: number;
    price_change_percentage_1h_in_currency: number;
    price_change_percentage_1y_in_currency: number;
    price_change_percentage_200d_in_currency: number;
    price_change_percentage_24h_in_currency: number;
    price_change_percentage_30d_in_currency: number;
    price_change_percentage_7d_in_currency: number;
  }

  export interface Roi {
    times: number;
    currency: string;
    percentage: number;
  }
}

async function fetchMetrics(page: number) {
  const url = `https://api.coingecko.com/api/v3/coins/markets`;

  const rawData: CoinGeckoResponse.Root = await got(url, {
    searchParams: {
      vs_currency: "usd",
      order: "market_cap_desc",
      per_page: PER_PAGE,
      page: page.toString(),
      price_change_percentage: "1h,24h,7d,14d,30d,200d,1y",
    },
  }).json();

  return rawData;
}

async function coinGeckoHandler(req: FastifyRequest) {
  const url = `https://api.coingecko.com/api/v3/coins/markets`;

  const allData = await Promise.all(
    Array.from({ length: PAGE_COUNT }, (_, i) => fetchMetrics(i + 1))
  );
  const rawData = allData.flat();

  // req.log.info("==result", rawData);

  return getMetrics(rawData, {
    namespace: NAMESPACE,
    keys: [
      "market_cap_rank",
      "circulating_supply",
      "total_supply",
      "max_supply",
    ],
    keyMappings: {
      current_price: "price_usd",
      market_cap: "market_cap_usd",
      total_volume: "total_volume_usd",
      high_24h: "high_24h_usd",
      low_24h: "low_24h_usd",
      price_change_24h: "price_change_24h_usd",
      price_change_percentage_24h: "price_change_24h_percent",
      market_cap_change_24h: "market_cap_change_24h_usd",
      market_cap_change_percentage_24h: "market_cap_change_24h_percent",
      ath: "ath_usd",
      ath_change_percentage: "ath_change_percent",
      atl: "atl_usd",
      atl_change_percentage: "atl_change_percent",
    },
    labelKeys: ["id", "name", "symbol"],
  }).join("\n");
}

const handler: FastifyPluginAsync = async (fastify, options) => {
  fastify.get("/coingecko", coinGeckoHandler);
};

export default handler;
