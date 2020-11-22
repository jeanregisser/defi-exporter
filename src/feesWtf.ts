import { FastifyRequest } from "fastify";
import puppeteer from "puppeteer";
import mapValues from "lodash.mapvalues";
import { getMetrics, parseNumericValue, puppeteerLaunch } from "./utils";
import BigNumber from "bignumber.js";

const NAMESPACE = "feeswtf";

type CustomRequest = FastifyRequest<{
  Querystring: { address: any };
}>;

function customParseNumericValue(value: string | undefined) {
  let result = new BigNumber(parseNumericValue(value || ""));
  if (value?.endsWith("million")) {
    result = result.multipliedBy(10 ** 9);
  }

  return result.toString();
}

export async function feesWtfHandler(req: CustomRequest) {
  const { address } = req.query;
  if (!address || typeof address !== "string") {
    throw new Error("Address is required");
  }
  const url = `https://fees.wtf/?address=${address}`;

  const browser = await puppeteerLaunch();
  const page = await browser.newPage();

  console.log("==goto", url);

  await page.goto(url, { waitUntil: "networkidle2" });

  await page.waitForFunction(() => {
    const value = document.getElementById("gasFeeTotal")?.innerText;
    return value && value !== "🤔";
  }, {});

  console.log("==done waiting");

  const promMetrics = await extractMetrics(page, address);
  // console.log("==promMetrics", promMetrics);

  // console.log("==done");

  await browser.close();

  return promMetrics.join("\n");
}

async function extractMetrics(page: puppeteer.Page, address: string) {
  const rawData = await page.evaluate(() => {
    // Define inline as this is running in the browser context
    function extractText(
      document: Document,
      selector: string
    ): string | undefined {
      const element = document.querySelector<HTMLElement>(selector);
      return element?.innerText.trim();
    }
    return {
      totalGasFeeEth: extractText(document, "#gasFeeTotal"),
      totalGasFeeUsd: extractText(document, "#ethusd"),
      totalGasUsed: extractText(document, "#gasUsedTotal"),
      txCount: extractText(document, "#nOut"),
      txAverageGasPriceGwei: extractText(document, "#gasPricePerTx"),
      failedTxCount: extractText(document, "#nOutFail"),
      totalFailedGasFeeEth: extractText(document, "#gasFeeTotalFail"),
    };
  });

  const processedData = mapValues(rawData, customParseNumericValue);

  return getMetrics(processedData, {
    namespace: NAMESPACE,
    labels: { address },
    keys: [
      "totalGasFeeEth",
      "totalGasFeeUsd",
      "totalGasUsed",
      "txCount",
      "txAverageGasPriceGwei",
      "failedTxCount",
      "totalFailedGasFeeEth",
    ],
  });
}
