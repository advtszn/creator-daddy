import "dotenv/config";

import { VoyageAIClient } from "voyageai";
import type { RerankResponse } from "voyageai/api";
import type { Result } from "~/types";

export class VoyageUtils {
  private readonly client: VoyageAIClient;

  constructor() {
    this.client = new VoyageAIClient({ apiKey: process.env.VOYAGEAI_API_KEY });
  }

  async rerank(
    documents: string[],
    query: string,
    topK = 10,
  ): Promise<Result<RerankResponse>> {
    try {
      const data = await this.client.rerank({
        documents,
        model: "rerank-2.5",
        query,
        topK,
      });
      return { success: true, data };
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : `Failed to rerank documents: ${err}`,
      };
    }
  }
}
