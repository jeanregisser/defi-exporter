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
    name: string;
    lockedGold: string;
    nonVotingLockedGold: string;
    pendingWithdrawals: string;
    metadataURL: string;
    cgld: string;
    cusd: string;
  }
}

function customParseNumericValue(value: string | undefined) {
  let result = new BigNumber(parseNumericValue(value || "")).dividedBy("1e18");
  return result.toString();
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
    lockedCelo: customParseNumericValue(rawData.lockedGold),
    nonVotingLockedCelo: customParseNumericValue(rawData.nonVotingLockedGold),
    pendingWithdrawalCelo: customParseNumericValue(rawData.pendingWithdrawals),
    celo: customParseNumericValue(rawData.cgld),
    cusd: customParseNumericValue(rawData.cusd),
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
