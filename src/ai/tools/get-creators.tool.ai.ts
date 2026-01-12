import { tool } from "ai";
import { Metadata, QueryResult } from "chromadb";
import mongoose from "mongoose";
import { z } from "zod";
import { initDB } from "~/mongoose/init.mongoose";
import { Socials } from "~/mongoose/socials.mongoose";
import { ChromaUtils } from "~/utils/chroma.utils";

const chromaUtils = new ChromaUtils();

/**
 * Tunable weights — tweak without touching logic
 */
const WEIGHTS = {
  niche: 0.4,
  style: 0.35,
  audience: 0.25,
} as const;

function distanceToSimilarity(distance: number) {
  return 1 / (1 + distance);
}

function computeWeightedSimilarity(creator: {
  nicheSimilarity?: number;
  styleSimilarity?: number;
  audienceSimilarity?: number;
}) {
  let weightedSum = 0;
  let weightTotal = 0;

  if (creator.nicheSimilarity !== undefined) {
    weightedSum +=
      distanceToSimilarity(creator.nicheSimilarity) * WEIGHTS.niche;
    weightTotal += WEIGHTS.niche;
  }

  if (creator.styleSimilarity !== undefined) {
    weightedSum +=
      distanceToSimilarity(creator.styleSimilarity) * WEIGHTS.style;
    weightTotal += WEIGHTS.style;
  }

  if (creator.audienceSimilarity !== undefined) {
    weightedSum +=
      distanceToSimilarity(creator.audienceSimilarity) * WEIGHTS.audience;
    weightTotal += WEIGHTS.audience;
  }

  if (weightTotal === 0) return 0;

  return weightedSum / weightTotal;
}

function formatQueryResult(
  result: QueryResult<Metadata>,
  type: "niche" | "style" | "audience",
) {
  const docs = result.documents?.[0] ?? [];
  const distances = result.distances?.[0] ?? [];
  const metadatas = result.metadatas?.[0] ?? [];
  const ids = result.ids?.[0] ?? [];

  return docs.map((doc, i) => ({
    type,
    id: ids[i],
    distance: distances[i],
    document: doc,
    socialId: metadatas[i]!.socialId as string,
  }));
}

const inputSchema = z.object({
  query: z
    .string()
    .describe(
      "The search query describing the type of creator the user is looking for",
    ),
});

export const getCreatorsTool = tool({
  description: `Search for creators based on natural language queries.
    Use this tool when the user is looking for creators, influencers, or content makers.
    The tool searches across niche, style, and target audience collections to find relevant creators.`,
  inputSchema,
  execute: async ({ query }) => {
    await initDB();
    const K = 10;

    const [nicheResult, styleResult, audienceResult] = await Promise.all([
      chromaUtils.queryNicheCollection(query, K),
      chromaUtils.queryStyleCollection(query, K),
      chromaUtils.queryAudienceCollection(query, K),
    ]);

    const errors: string[] = [];
    if (!nicheResult.success) errors.push(`Niche: ${nicheResult.error}`);
    if (!styleResult.success) errors.push(`Style: ${styleResult.error}`);
    if (!audienceResult.success)
      errors.push(`Audience: ${audienceResult.error}`);

    if (!nicheResult.success) {
      return { success: false, error: errors.join("; "), creators: [] };
    }
    if (!styleResult.success) {
      return { success: false, error: errors.join("; "), creators: [] };
    }
    if (!audienceResult.success) {
      return { success: false, error: errors.join("; "), creators: [] };
    }

    const niches = formatQueryResult(nicheResult.data, "niche");
    const styles = formatQueryResult(styleResult.data, "style");
    const audiences = formatQueryResult(audienceResult.data, "audience");

    const union = Object.values(
      [...niches, ...styles, ...audiences].reduce<Record<string, any>>(
        (acc, curr) => {
          const id = curr.socialId;

          acc[id] ??= { socialId: id };

          if (curr.type === "niche") {
            acc[id].nicheSummary = curr.document;
            acc[id].nicheSimilarity = curr.distance;
          }

          if (curr.type === "style") {
            acc[id].styleSummary = curr.document;
            acc[id].styleSimilarity = curr.distance;
          }

          if (curr.type === "audience") {
            acc[id].audienceSummary = curr.document;
            acc[id].audienceSimilarity = curr.distance;
          }

          return acc;
        },
        {},
      ),
    );

    const enriched = await Promise.all(
      union.map(async (creator) => {
        const weightedSimilarity = computeWeightedSimilarity(creator);

        const metadata = await Socials.findById(creator.socialId).lean();

        console.log(metadata);

        const {
          nicheSimilarity,
          styleSimilarity,
          audienceSimilarity,
          socialId,
          ...cleanCreator
        } = creator;

        return {
          ...cleanCreator,
          ...metadata,
          weightedSimilarity,
        };
      }),
    );

    const sorted = enriched.sort(
      (a, b) => b.weightedSimilarity - a.weightedSimilarity,
    );

    console.log(sorted);

    return {
      success: true,
      creators: sorted.slice(0, 6),
    };

    // // Union results by socialId, keeping the best score for each
    // const creatorsMap = new Map<
    //   string,
    //   {
    //     socialId: string;
    //     document: string;
    //     score: number;
    //     source: string;
    //   }
    // >();

    // const processResults = (result: typeof nicheResult, source: string) => {
    //   if (!result.success) return;

    //   const { ids, documents, distances, metadatas } = result.data;
    //   if (!ids[0] || !documents[0] || !distances[0] || !metadatas[0]) return;

    //   for (let i = 0; i < ids[0].length; i++) {
    //     const metadata = metadatas[0][i];
    //     const socialId = metadata?.socialId as string | undefined;
    //     if (!socialId) continue;

    //     const score = 1 - (distances[0][i] ?? 1); // Convert distance to similarity
    //     const existing = creatorsMap.get(socialId);

    //     if (!existing || score > existing.score) {
    //       creatorsMap.set(socialId, {
    //         socialId,
    //         document: documents[0][i] ?? "",
    //         score,
    //         source,
    //       });
    //     }
    //   }
    // };

    // processResults(nicheResult, "niche");
    // processResults(styleResult, "style");
    // processResults(audienceResult, "audience");

    // console.log(creatorsMap);

    // // Sort by score descending
    // const rankedCreators = Array.from(creatorsMap.values()).sort(
    //   (a, b) => b.score - a.score,
    // );

    // // Fetch social info from MongoDB
    // await connectToDatabase();
    // const socialIds = rankedCreators.map((c) =>
    //   new mongoose.Types.ObjectId(c.socialId),
    // );

    // // Debug: check if we can find any document
    // const testDoc = await Social.findOne({}).lean();
    // console.log("Test doc from collection:", testDoc);
    // console.log("Looking for IDs:", socialIds.slice(0, 3));

    // const socials = await Social.find({ _id: { $in: socialIds } }).lean();

    // console.log("Found socials:", socials.length);

    // // Create a map for quick lookup
    // const socialsMap = new Map(socials.map((s) => [s._id.toString(), s]));

    // console.log(socialsMap);

    // // Merge social info with ranked creators
    // const creators: Creator[] = rankedCreators
    //   .map((creator) => {
    //     const social = socialsMap.get(creator.socialId);
    //     if (!social) return null;

    //     return {
    //       ...creator,
    //       creatorName: social.creatorName,
    //       handle: social.handle,
    //       followersCount: social.followersCount,
    //       profileImage: social.profileImage,
    //     };
    //   })
    //   .filter((c): c is Creator => c !== null);

    // console.log(creators);

    // return {
    //   success: true,
    //   creators,
    //   totalFound: creators.length,
    // };
  },
});
