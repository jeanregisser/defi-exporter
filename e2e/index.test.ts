import got from "got";
// @ts-ignore
import parsePrometheusTextFormat from "parse-prometheus-text-format";

const client = got.extend({
  prefixUrl: process.env.TEST_APP_URL || "http://localhost:3000",
});

const ETHEREUM_TEST_ADDRESS = "0x5853ed4f26a3fcea565b3fbc698bb19cdf6deb85"; // debanker.eth
const APY_VISION_TEST_ADDRESS = "0x006cc1b89e9b68e08eec14a514d17b47b363acce"; // Their demo account
const CELO_TEST_ADDRESS = "0x01b2b83fDf26aFC3Ca7062C35Bc68c8DdE56dB04"; // Figment validator group
const CELO_TEST_ADDRESS_2 = "0x34649AdA2cB44D851a2103Feaa8922DedDABfc1c"; // Bitcandy validator group

jest.setTimeout(60 * 1000); // 60 secs timeouts

describe("GET /zapper", () => {
  it("responds with prometheus metrics", async () => {
    const response = await client.get("zapper", {
      searchParams: { address: ETHEREUM_TEST_ADDRESS },
    });
    expect(response.statusCode).toBe(200);
    const parsed = parsePrometheusTextFormat(response.body);
    expect(parsed.length).toBeGreaterThan(0);
    // TODO: add more assertions
  });
});

// FIXME
describe.skip("GET /feesWtf", () => {
  it("responds with prometheus metrics", async () => {
    const response = await client.get("feesWtf", {
      searchParams: { address: ETHEREUM_TEST_ADDRESS },
    });
    expect(response.statusCode).toBe(200);
    const parsed = parsePrometheusTextFormat(response.body);
    expect(parsed.length).toBeGreaterThan(0);
  });
});

describe("GET /apyVision", () => {
  it("responds with prometheus metrics", async () => {
    const response = await client.get("apyVision", {
      // ETHEREUM_TEST_ADDRESS has too many pools and takes a long time
      // we use APY_VISION_TEST_ADDRESS instead
      searchParams: { address: APY_VISION_TEST_ADDRESS },
    });
    expect(response.statusCode).toBe(200);
    const parsed = parsePrometheusTextFormat(response.body);
    expect(parsed.length).toBeGreaterThan(0);
  });
});

// FIXME
describe.skip("GET /thecelo", () => {
  describe("with a single address", () => {
    it("responds with prometheus metrics", async () => {
      const response = await client.get("thecelo", {
        searchParams: { addresses: CELO_TEST_ADDRESS },
      });
      expect(response.statusCode).toBe(200);
      const parsed = parsePrometheusTextFormat(response.body);
      expect(parsed.length).toBeGreaterThan(0);
    });
  });

  describe("with multiples addresses", () => {
    it("responds with prometheus metrics", async () => {
      const response = await client.get("thecelo", {
        searchParams: new URLSearchParams([
          ["addresses", CELO_TEST_ADDRESS],
          ["addresses", CELO_TEST_ADDRESS_2],
        ]),
      });
      expect(response.statusCode).toBe(200);
      const parsed = parsePrometheusTextFormat(response.body);
      expect(parsed.length).toBeGreaterThan(0);
    });
  });
});

describe("GET /coingecko", () => {
  it("responds with prometheus metrics", async () => {
    const response = await client.get("coingecko");
    expect(response.statusCode).toBe(200);
    const parsed = parsePrometheusTextFormat(response.body);
    expect(parsed.length).toBeGreaterThan(0);
  });
});
