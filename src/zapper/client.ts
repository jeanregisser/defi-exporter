import got from "got";

const API_KEY = process.env.ZAPPER_API_KEY;
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.198 Safari/537.36";

export async function fetchBalance<T>(
  service: string,
  address: string
): Promise<T> {
  const url = `https://zapper.fi/api/account-balance/${service}?addresses=${address}`;

  const rawData: T = await got(url, {
    headers: {
      "api-key": API_KEY,
      "user-agent": USER_AGENT,
    },
  }).json();

  return rawData;
}
