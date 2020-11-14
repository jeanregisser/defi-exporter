import { Request, Response } from "express";
import puppeteer from "puppeteer";
import BigNumber from "bignumber.js";
import snakeCase from "lodash.snakecase";
import mapValues from "lodash.mapvalues";

function parseNumericValue(value: string) {
  return new BigNumber(value.replace(/[^0-9\.-]+/g, "")).toString();
}

function convertToPromMetricName(value: string) {
  return `poolsvision_${snakeCase(value).replace("_h_", "h_")}`;
}

export async function poolsVisionHandler(req: Request, res: Response) {
  const { address } = req.query;
  if (!address || typeof address !== "string") {
    throw new Error("Address is required");
  }
  const url = `http://pools.vision/user/${address}`;

  const browser = await puppeteer.launch({
    headless: process.env.NODE_ENV === "production",
    args: [
      // Required for Docker version of Puppeteer
      "--no-sandbox",
      "--disable-setuid-sandbox",
      // This will write shared memory files into /tmp instead of /dev/shm,
      // because Docker’s default for /dev/shm is 64MB
      "--disable-dev-shm-usage",
    ],
    defaultViewport: {
      width: 1200,
      height: 900,
      // deviceScaleFactor: 1,
    },
  });

  const page = await browser.newPage();

  // console.log("==goto", url);

  await page.goto(url, { waitUntil: "networkidle2" });

  await page.waitForSelector("tbody > tr > td > a");

  // console.log("==done waiting");

  const balancerMetrics = await extractBalancerMetrics(page);
  const userPoolMetrics = await extractUserPoolMetrics(page, address);

  const promMetrics = [...balancerMetrics, ...userPoolMetrics];
  // console.log("==promMetrics", promMetrics);

  // console.log("==done");

  await browser.close();

  res.send(promMetrics.join("\n"));
}

async function extractUserPoolMetrics(page: puppeteer.Page, address: string) {
  const rows = await page.evaluate(() => {
    const poolsTable = document.querySelectorAll("table")[1];
    const poolAddressNodes = poolsTable.querySelectorAll(
      "[data-label='Pool Address'] > a"
    );
    const assetsNodes = poolsTable.querySelectorAll(`[data-label='Assets']`);
    const swapFeeNodes = poolsTable.querySelectorAll<HTMLElement>(
      `[data-label='Swap Fee']`
    );
    const totalLiquidityNodes = poolsTable.querySelectorAll<HTMLElement>(
      `[data-label='Total Liquidity']`
    );
    const volume24hNodes = poolsTable.querySelectorAll<HTMLElement>(
      `[data-label='24h Volume']`
    );
    const fees24hFeeNodes = poolsTable.querySelectorAll<HTMLElement>(
      `[data-label='24h Fees']`
    );
    const annualBalNodes = poolsTable.querySelectorAll<HTMLElement>(
      `[data-label='Annual BAL']`
    );
    const totalApyNodes = poolsTable.querySelectorAll<HTMLElement>(
      `[data-label='APY']`
    );
    const userPoolPctNodes = poolsTable.querySelectorAll<HTMLElement>(
      `[data-label='User %']`
    );
    const poolProviderCountNodes = poolsTable.querySelectorAll<HTMLElement>(
      `[data-label='# of LP\\'s']`
    );

    const pools = [];
    for (let i = 0; i < poolAddressNodes.length; i++) {
      const [
        totalLiquidityUsd,
        totalLiquidityAdjustedUsd,
      ] = totalLiquidityNodes[i].innerText.trim().split("\n");

      const href = poolAddressNodes[i].getAttribute("href") || "";
      const id = href.split("/").pop() || "";

      pools.push({
        id,
        link: href,
        name: [...assetsNodes[i].querySelectorAll("span")]
          .map((v) => v.innerText.trim())
          .join(" / "),
        swapFeePercent: swapFeeNodes[i].innerText.trim(),
        totalLiquidityUsd,
        totalLiquidityAdjustedUsd,
        volume24hUsd: volume24hNodes[i].innerText.trim(),
        fees24hUsd: fees24hFeeNodes[i].innerText.trim(),
        annualBal: annualBalNodes[i].innerText.trim(),
        totalApy: totalApyNodes[i].innerText.trim(),
        userPoolPercent: userPoolPctNodes[i].innerText.trim(),
        poolProviderCount: poolProviderCountNodes[i].innerText.trim(),
      });
    }
    return pools;
  });

  const processedRows = rows.map((row) => ({
    ...row,
    swapFeePercent: parseNumericValue(row.swapFeePercent),
    totalLiquidityUsd: parseNumericValue(row.totalLiquidityUsd),
    totalLiquidityAdjustedUsd: parseNumericValue(row.totalLiquidityAdjustedUsd),
    volume24hUsd: parseNumericValue(row.volume24hUsd),
    fees24hUsd: parseNumericValue(row.fees24hUsd),
    annualBal: parseNumericValue(row.annualBal),
    totalApy: parseNumericValue(row.totalApy),
    userPoolPercent: parseNumericValue(row.userPoolPercent),
    poolProviderCount: parseNumericValue(row.poolProviderCount),
  }));

  // console.log("==rows", rows);
  // console.log("==processedRows", processedRows);

  const promMetrics: string[] = [];
  processedRows.forEach((row) => {
    const labels = {
      poolId: row.id,
      name: row.name,
      address,
    };

    const formattedLabels = Object.entries(labels)
      .map(([key, value]) => `${key}:"${value}"`)
      .join(",");
    const filteredKeys = new Set(["id", "link", "name"]);

    for (const key of Object.keys(row).filter(
      (key) => !filteredKeys.has(key)
    ) as Array<keyof typeof row>) {
      const formattedKey = convertToPromMetricName(key);
      promMetrics.push(`${formattedKey}\{${formattedLabels}\} ${row[key]}`);
    }
  });

  return promMetrics;
}

async function extractBalancerMetrics(page: puppeteer.Page) {
  const rawData = await page.evaluate(() => {
    const balancerTable = document.querySelectorAll("table")[0];
    const balPriceNodes = balancerTable.querySelectorAll<HTMLElement>(
      `[data-label='BAL Price']`
    );
    const volume24hNodes = balancerTable.querySelectorAll<HTMLElement>(
      `[data-label='24h Volume']`
    );
    const fees24hFeeNodes = balancerTable.querySelectorAll<HTMLElement>(
      `[data-label='24h Fees Earned']`
    );
    const totalLiquidityNodes = balancerTable.querySelectorAll<HTMLElement>(
      `[data-label='Total Liquidity']`
    );
    const totalLiquidityAdjustedNodes = balancerTable.querySelectorAll<
      HTMLElement
    >(`[data-label='Total Adj. Liquidity']`);
    const totalLiquidityAdjustedWithStakingNodes = balancerTable.querySelectorAll<
      HTMLElement
    >(`[data-label='Adj. Liquidity w/Staking']`);
    const balMultiplier = balancerTable.querySelectorAll<HTMLElement>(
      `[data-label='BAL Multiplier']`
    );

    return {
      balPriceUsd: balPriceNodes[0].innerText.trim(),
      volume24hUsd: volume24hNodes[0].innerText.trim(),
      fees24hUsd: fees24hFeeNodes[0].innerText.trim(),
      totalLiquidityUsd: totalLiquidityNodes[0].innerText.trim(),
      totalLiquidityAdjustedUsd: totalLiquidityAdjustedNodes[0].innerText.trim(),
      totalLiquidityAdjustedWithStakingUsd: totalLiquidityAdjustedWithStakingNodes[0].innerText.trim(),
      balMultiplier: balMultiplier[0].innerText.trim(),
    };
  });

  const processedData = mapValues(rawData, parseNumericValue);

  // console.log("==processedData", processedData);

  const labels = {};
  const formattedLabels = Object.entries(labels)
    .map(([key, value]) => `${key}:"${value}"`)
    .join(",");

  return Object.entries(processedData).map(([key, value]) => {
    const formattedKey = convertToPromMetricName(key);
    return `${formattedKey}\{${formattedLabels}\} ${value}`;
  });
}
