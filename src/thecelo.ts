import BigNumber from "bignumber.js";
import { FastifyRequest } from "fastify";
import got from "got";
import { getMetrics, parseNumericValue } from "./utils";

const NAMESPACE = "thecelo";

type CustomRequest = FastifyRequest<{
  Querystring: { address: any };
}>;

namespace TheCeloResponse {
  export interface Root {
    totalLockedGold: number;
    nonvotingLockedGold: number;
    pendingWithdrawals: number;
    celo: number;
    cusd: number;
    name: string;
    type: string;
    metadataURL: string;
  }
}

export async function theCeloHandler(req: CustomRequest) {
  const { address } = req.query;
  if (!address || typeof address !== "string") {
    throw new Error("Address is required");
  }
  const url = `https://thecelo.com/api/?method=account&address=${address}`;

  const rawData: TheCeloResponse.Root = await got(url, {
    // There's currently an incorrect SSL config with thecelo.com
    // and we get "unable to verify the first certificate"
    https: {
      rejectUnauthorized: false,
    },
  }).json();

  // req.log.info("==result", rawData);

  const data = {
    lockedCelo: rawData.totalLockedGold,
    nonVotingLockedCelo: rawData.nonvotingLockedGold,
    pendingWithdrawalCelo: rawData.pendingWithdrawals,
    celo: rawData.celo,
    cusd: rawData.cusd,
  };

  return getMetrics(data, {
    namespace: NAMESPACE,
    keys: [
      "lockedCelo",
      "nonVotingLockedCelo",
      "pendingWithdrawalCelo",
      "celo",
      "cusd",
    ],
    labels: { address },
  }).join("\n");
}
