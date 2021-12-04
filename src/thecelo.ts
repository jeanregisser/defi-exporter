import BigNumber from "bignumber.js";
import { FastifyPluginAsync, FastifyRequest } from "fastify";
import got from "got";
import { getMetrics, parseNumericValue } from "./utils";
import { Static, Type } from "@sinclair/typebox";

const NAMESPACE = "thecelo";

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

async function theCeloHandler(address: string) {
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

const QuerystringSchema = Type.Object({
  addresses: Type.Array(Type.String()),
});

const handler: FastifyPluginAsync = async (fastify, options) => {
  fastify.get<{ Querystring: Static<typeof QuerystringSchema> }>(
    "/thecelo",
    {
      schema: {
        querystring: QuerystringSchema,
        response: {
          200: {
            type: "string",
          },
        },
      },
    },
    async (req, rep) => {
      const result = await Promise.all(req.query.addresses.map(theCeloHandler));
      return result.join("\n");
    }
  );
};

export default handler;
