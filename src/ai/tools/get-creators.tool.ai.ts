import { tool } from "ai";
import type { Metadata, QueryResult } from "chromadb";
import { z } from "zod";
import { initDB } from "~/mongoose/init.mongoose";
import { Socials } from "~/mongoose/socials.mongoose";
import type { Creator, GetCreatorsToolOutput, SocialProfile } from "~/types";
import { ChromaUtils } from "~/utils/chroma.utils";
import { VoyageUtils } from "~/utils/voyage.utils";
import { encode } from "@toon-format/toon";

const chromaUtils = new ChromaUtils();
const voyageUtils = new VoyageUtils();

/**
 * Tunable weights — tweak without touching logic
 */
const WEIGHTS = {
  niche: 0.4,
  style: 0.35,
  audience: 0.25,
} as const;

type QueryResultType = "niche" | "style" | "audience";

interface FormattedQueryResult {
  type: QueryResultType;
  id: string;
  distance: number;
  document: string | null;
  socialId: string;
}

interface CreatorSimilarities {
  socialId: string;
  nicheSummary?: string;
  nicheSimilarity?: number;
  styleSummary?: string;
  styleSimilarity?: number;
  audienceSummary?: string;
  audienceSimilarity?: number;
}

function distanceToSimilarity(distance: number): number {
  return 1 / (1 + distance);
}

function computeWeightedSimilarity(creator: {
  nicheSimilarity?: number;
  styleSimilarity?: number;
  audienceSimilarity?: number;
}): number {
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
  type: QueryResultType,
): FormattedQueryResult[] {
  const docs = result.documents?.[0] ?? [];
  const distances = result.distances?.[0] ?? [];
  const metadatas = result.metadatas?.[0] ?? [];
  const ids = result.ids?.[0] ?? [];

  return docs.map((doc, i) => ({
    type,
    id: ids[i]!,
    distance: distances[i]!,
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
      return {
        success: false,
        error: errors.join("; "),
        creators: [],
      } satisfies GetCreatorsToolOutput;
    }
    if (!styleResult.success) {
      return {
        success: false,
        error: errors.join("; "),
        creators: [],
      } satisfies GetCreatorsToolOutput;
    }
    if (!audienceResult.success) {
      return {
        success: false,
        error: errors.join("; "),
        creators: [],
      } satisfies GetCreatorsToolOutput;
    }

    const niches = formatQueryResult(nicheResult.data, "niche");
    const styles = formatQueryResult(styleResult.data, "style");
    const audiences = formatQueryResult(audienceResult.data, "audience");

    const union = Object.values(
      [...niches, ...styles, ...audiences].reduce<
        Record<string, CreatorSimilarities>
      >((acc, curr) => {
        const id = curr.socialId;

        acc[id] ??= { socialId: id };

        if (curr.type === "niche") {
          acc[id].nicheSummary = curr.document ?? undefined;
          acc[id].nicheSimilarity = curr.distance;
        }

        if (curr.type === "style") {
          acc[id].styleSummary = curr.document ?? undefined;
          acc[id].styleSimilarity = curr.distance;
        }

        if (curr.type === "audience") {
          acc[id].audienceSummary = curr.document ?? undefined;
          acc[id].audienceSimilarity = curr.distance;
        }

        return acc;
      }, {}),
    );

    const enriched: Creator[] = await Promise.all(
      union.map(async (creator): Promise<Creator> => {
        const weightedSimilarity = computeWeightedSimilarity(creator);

        const metadata = (await Socials.findById(
          creator.socialId,
        ).lean()) as SocialProfile | null;

        return {
          _id: creator.socialId,
          creatorName: metadata?.creatorName ?? "",
          handle: metadata?.handle ?? "",
          platformId: metadata?.platformId ?? "",
          followersCount: metadata?.followersCount ?? 0,
          profileImage: metadata?.profileImage ?? "",
          nicheSummary: creator.nicheSummary,
          styleSummary: creator.styleSummary,
          audienceSummary: creator.audienceSummary,
          weightedSimilarity,
        };
      }),
    );

    const toonDocuments = enriched.map((document) =>
      encode({
        creatorName: document.creatorName,
        handle: document.handle,
        nicheSummary: document.nicheSummary,
        styleSummary: document.styleSummary,
        audienceSummary: document.audienceSummary,
      }),
    );

    console.log(toonDocuments);

    const rerankResult = await voyageUtils.rerank(toonDocuments, query, 6);

    if (!rerankResult.success) {
      return {
        success: false,
        error: `Failed to rerank documents: ${rerankResult.error}`,
        creators: [],
      } satisfies GetCreatorsToolOutput;
    }

    const creators = rerankResult.data.data?.map((document) => ({
      ...enriched[document.index!],
      relevanceScore: document.relevanceScore,
    })) as Creator[];

    console.log(creators);

    return {
      success: true,
      creators,
    } satisfies GetCreatorsToolOutput;
  },
});
