import { FastifyPluginAsync, FastifyRequest } from "fastify";
import { getMetrics, isPresent } from "../utils";
import { fetchBalances } from "./client";
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

async function zapperHandler(req: CustomRequest) {
  const { address } = req.query;
  if (!address || typeof address !== "string") {
    throw new Error("Address is required");
  }

  const rawData = await fetchBalances<ZapperBalancesResponse.Root>(address);

  const metrics = rawData.map((data) => {
    const assets = [
      ...(data.app?.data || []),
      ...Object.values(data.balance.wallet),
    ]
      .filter(isPresent)
      .map((app) => ({
        ...app,
        label: app.displayProps.label,
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

  return metrics.join("\n");
}

const handler: FastifyPluginAsync = async (fastify, options) => {
  fastify.get("/zapper", zapperHandler);
};

export default handler;
