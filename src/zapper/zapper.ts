import { FastifyPluginAsync, FastifyRequest } from "fastify";
import { getMetrics, isPresent } from "../utils";
import {
  fetchApps,
  fetchJobStatus,
  fetchTokens,
  updateApps,
  updateTokens,
} from "./client";
import { NAMESPACE } from "./consts";

type CustomRequest = FastifyRequest<{
  Querystring: { address: any };
}>;

// Generic balance response (different apps have more fields
namespace ZapperBalancesResponse {
  export interface Root {
    appId: string;
    network: string;
    addresses: string[];
    balance: Balance;
    totals: Total[];
    errors: any[];
    app?: App;
  }

  export interface Balance {
    deposits: Deposits;
    debt: Debt;
    vesting: Vesting;
    wallet: Wallet;
    claimable: Claimable;
    locked: Locked;
    nft: Nft;
  }

  export interface Deposits {}

  export interface Debt {}

  export interface Vesting {}

  export interface Wallet {
    [address: string]: Asset | undefined;
  }

  export interface Claimable {}

  export interface Locked {}

  export interface Nft {}

  export interface Total {
    key: string;
    type: string;
    network: string;
    balanceUSD: number;
  }

  export interface App {
    appId: string;
    network: string;
    data: Asset[];
    displayProps: AppDisplayProps;
    meta: Meta;
  }

  export interface Asset {
    key: string;
    appId: string;
    address: string;
    network: string;
    balanceUSD: number;
    metaType: string;
    displayProps: DisplayProps;
    type: string;
    contractType: string;
    context: Context;
    breakdown: Asset[];
  }

  export interface DisplayProps {
    label: string;
    secondaryLabel: Label;
    tertiaryLabel: Label;
    images: string[];
    stats: Stat[];
    info: Info[];
    balanceDisplayMode: string;
  }

  export interface AppDisplayProps {
    appName: string;
    images: string[];
  }

  export interface Label {
    type: string;
    value: string;
  }

  export interface Stat {
    label: Label;
    value: Value;
  }

  export interface Value {
    type: string;
    value: any;
  }

  export interface Info {
    label: Label;
    value: Value;
  }

  export interface Context {
    symbol: string;
    balance: number;
    decimals: number;
    balanceRaw: string;
    price: number;
  }

  export interface Meta {
    total: number;
  }
}

const JOB_POLLING_INTERVAL_MS = 1_000;
const JOB_POLLING_MAX_RETRIES = 30;

async function waitForCompletedJob(
  jobId: string,
  maxRetries = JOB_POLLING_MAX_RETRIES
) {
  let retries = 0;
  while (retries < maxRetries) {
    const jobStatus = await fetchJobStatus(jobId);
    if (jobStatus.status === "completed") {
      return;
    }
    await new Promise((resolve) =>
      setTimeout(resolve, JOB_POLLING_INTERVAL_MS)
    );
    retries++;
  }

  throw new Error(`Job ${jobId} did not complete in time`);
}

async function zapperHandler(req: CustomRequest) {
  const { address } = req.query;
  if (!address || typeof address !== "string") {
    throw new Error("Address is required");
  }

  const updateResponses = await Promise.all([
    updateTokens(address),
    updateApps(address),
  ]);

  const jobIds = updateResponses.map((res) => res.jobId);

  req.log.info({ jobIds }, "Waiting for jobs to complete");

  await Promise.all(jobIds.map((jobId) => waitForCompletedJob(jobId)));

  const rawTokensData = await fetchTokens(address);

  const tokensMetrics = Object.values(rawTokensData).map((data) => {
    const tokens = data.map((addressToken) => ({
      ...addressToken.token,
      network: addressToken.network,
    }));
    const metrics = getMetrics(tokens, {
      namespace: NAMESPACE,
      keys: ["balanceUSD"],
      labels: { appId: "tokens", assetType: "base-token", address },
      labelKeys: ["network"],
      labelMappings: {
        address: "assetAddress",
        symbol: "assetName",
      },
    });
    return metrics.join("\n");
  });

  const rawAppsData = await fetchApps(address);

  const appMetrics = rawAppsData.map((data) => {
    const assets = data.products
      .flatMap((product) => product.assets)
      .map((asset) => ({
        ...asset,
        label: asset.displayProps.label,
      }));
    const metrics = getMetrics(assets, {
      namespace: NAMESPACE,
      keys: ["balanceUSD"],
      labels: { network: data.network, appId: data.appId, address },
      labelMappings: {
        address: "assetAddress",
        label: "assetName",
        type: "assetType",
      },
    });

    return metrics.join("\n");
  });

  return [...tokensMetrics, ...appMetrics].join("\n");
}

const handler: FastifyPluginAsync = async (fastify, options) => {
  fastify.get("/zapper", zapperHandler);
};

export default handler;
