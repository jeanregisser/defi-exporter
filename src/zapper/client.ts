import got from "got";

const API_KEY = process.env.ZAPPER_API_KEY;

namespace ZapperSupportedBalancesResponse {
  export type Root = Network[];

  export interface Network {
    network: string;
    protocols: Protocol[];
  }

  export interface Protocol {
    protocol: string;
    meta: Meta;
  }

  export interface Meta {
    tags: string[];
    supportedActions: string[];
    label?: string;
    img?: string;
  }
}

export async function fetchSupportedBalances(address: string) {
  const response: ZapperSupportedBalancesResponse.Root = await got(
    `https://api.zapper.fi/v1/protocols/balances/supported`,
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
  protocol: string,
  address: string,
  network?: string
): Promise<T> {
  const url = `https://api.zapper.fi/v1/protocols/${protocol}/balances`;

  try {
    const rawData: T = await got(url, {
      searchParams: {
        api_key: API_KEY,
        "addresses[]": address,
        network,
      },
    }).json();

    return rawData;
  } catch (error) {
    // Augment error object so the url is logged too (options is not enumerable and not logged by default)
    error.url = error.options.url;
    throw error;
  }
}
