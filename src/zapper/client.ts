import EventSource from "eventsource";
import got from "got";

const API_KEY = process.env.ZAPPER_API_KEY;

interface ZapperUpdateJobResponse {
  jobId: string;
}

namespace ZapperSupportedBalancesResponse {
  export type Root = Network[];

  export interface Network {
    network: string;
    apps: App[];
  }

  export interface App {
    appId: string;
    meta: Meta;
  }

  export interface Meta {
    label: string;
    img: string;
    tags: string[];
    supportedActions: string[];
  }
}

export async function fetchSupportedBalances(address: string) {
  const response: ZapperSupportedBalancesResponse.Root = await got(
    `https://api.zapper.fi/v2/apps/balances/supported`,
    {
      searchParams: {
        api_key: API_KEY,
        "addresses[]": address,
      },
    }
  ).json();

  return response;
}

export async function fetchBalance<T>(
  appId: string,
  address: string,
  network?: string
): Promise<T> {
  const rawData: T = await got(
    `https://api.zapper.fi/v2/apps/${appId}/balances`,
    {
      searchParams: {
        api_key: API_KEY,
        "addresses[]": address,
        network,
      },
    }
  ).json();

  return rawData;
}

export async function fetchBalances<T>(address: string): Promise<T[]> {
  const url = `https://api.zapper.fi/v2/balances?addresses[]=${address}`;
  const eventSourceDict = {
    withCredentials: true,
    headers: {
      "Content-Type": "text/event-stream",
      "User-Agent": "Mozilla/5.0",
      Authorization: `Basic ${Buffer.from(`${API_KEY}:`, "binary").toString(
        "base64"
      )}`,
    },
  };

  const allData: T[] = [];

  return new Promise((resolve, reject) => {
    const eventSource = new EventSource(url, eventSourceDict);

    eventSource.addEventListener("open", () => {
      console.log("Opened");
    });

    eventSource.addEventListener("balance", ({ data }) => {
      const parsedDatas = JSON.parse(data);
      allData.push(parsedDatas);
    });

    eventSource.addEventListener("end", () => {
      eventSource.close();
      resolve(allData);
    });

    eventSource.addEventListener("error", (event) => {
      reject(
        new Error(
          `Error fetching balances from Zapper: ${
            (event as any).message || event
          }`
        )
      );
    });
  });
}

namespace ZapperTokensResponse {
  export interface Root {
    [address: string]: AddressToken[];
  }

  export interface AddressToken {
    key: string;
    address: string;
    network: string;
    updatedAt: string;
    token: Token;
  }

  export interface Token {
    id: string;
    networkId: number;
    address: string;
    label: string;
    name: string;
    symbol: string;
    decimals: number;
    coingeckoId: string;
    status: string;
    hide: boolean;
    canExchange: boolean;
    verified: boolean;
    externallyVerified: boolean;
    priceUpdatedAt: string;
    updatedAt: string;
    createdAt: string;
    price: number;
    dailyVolume: number;
    totalSupply: string;
    holdersEnabled: boolean;
    marketCap: number;
    balance: number;
    balanceUSD: number;
    balanceRaw: string;
  }
}

export async function fetchTokens(address: string) {
  const data = await got(`https://api.zapper.fi/v2/balances/tokens`, {
    searchParams: {
      api_key: API_KEY,
      "addresses[]": address,
    },
  }).json<ZapperTokensResponse.Root>();

  return data;
}

namespace ZapperAppsResponse {
  export type Root = AppData[];

  export interface AppData {
    key: string;
    address: string;
    appId: string;
    appName: string;
    appImage: string;
    network: string;
    updatedAt: string;
    balanceUSD: number;
    products: Product[];
  }

  export interface Product {
    label: string;
    assets: Asset[];
    meta: Meta[];
  }

  export interface Asset {
    key: string;
    type: string;
    appId: string;
    groupId: string;
    network: string;
    address: string;
    // tokens: Token[];
    symbol?: string;
    decimals?: number;
    supply?: number;
    pricePerShare?: number[];
    price?: number;
    dataProps: DataProps;
    displayProps: DisplayProps;
    balance?: number;
    balanceRaw?: string;
    balanceUSD: number;
  }

  export interface StatsItem {
    label: string;
    value: Value;
  }

  export interface Value {
    type: string;
    value: number;
  }

  export interface SecondaryLabel {
    type: string;
    value: number;
  }

  export interface DataProps {
    liquidity?: number;
    reserves?: number[];
    apy?: number;
    isDebt?: boolean;
    poolId?: string;
    poolType?: string;
    fee?: number;
    weights?: number[];
    volume?: number;
    weight?: number[];
    liquidationThreshold?: number;
    enabledAsCollateral?: boolean;
    isActive?: boolean;
    gaugeType?: string;
  }

  export interface DisplayProps {
    label: string;
    secondaryLabel: any;
    images: string[];
    statsItems: StatsItem[];
    tertiaryLabel?: string;
    labelDetailed?: string;
  }

  export interface Meta {
    label: string;
    value: number;
    type: string;
  }
}

export async function fetchApps(address: string) {
  const data = await got(`https://api.zapper.fi/v2/balances/apps`, {
    searchParams: {
      api_key: API_KEY,
      "addresses[]": address,
    },
  }).json<ZapperAppsResponse.Root>();

  return data;
}

export async function updateApps(address: string) {
  const data = await got
    .post(`https://api.zapper.fi/v2/balances/apps`, {
      searchParams: {
        api_key: API_KEY,
        "addresses[]": address,
      },
    })
    .json<ZapperUpdateJobResponse>();

  return data;
}

export async function updateTokens(address: string) {
  const data = await got
    .post(`https://api.zapper.fi/v2/balances/tokens`, {
      searchParams: {
        api_key: API_KEY,
        "addresses[]": address,
      },
    })
    .json<ZapperUpdateJobResponse>();

  return data;
}

interface ZapperJobStatusResponse {
  jobId: string;
  status: "active" | "completed" | "unknown";
}

export async function fetchJobStatus(jobId: string) {
  const data = await got(`https://api.zapper.fi/v2/balances/job-status`, {
    searchParams: {
      api_key: API_KEY,
      jobId,
    },
  }).json<ZapperJobStatusResponse>();

  return data;
}
