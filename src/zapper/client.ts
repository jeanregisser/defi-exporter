import EventSource from "eventsource";
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
