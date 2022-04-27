import got from "got";

const API_KEY = process.env.ZAPPER_API_KEY;

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
