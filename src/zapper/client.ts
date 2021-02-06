import got from "got";

const API_KEY = process.env.ZAPPER_API_KEY;

export async function fetchBalance<T>(
  service: string,
  address: string
): Promise<T> {
  const url = `https://api.zapper.fi/v1/balances/${service}`;

  try {
    const rawData: T = await got(url, {
      searchParams: {
        api_key: API_KEY,
        "addresses[]": address,
      },
    }).json();

    return rawData;
  } catch (error) {
    // Augment error object so the url is logged too (options is not enumerable and not logged by default)
    error.url = error.options.url;
    throw error;
  }
}
