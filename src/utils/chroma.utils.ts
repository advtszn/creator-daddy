import "dotenv/config";
import { GoogleGeminiEmbeddingFunction } from "@chroma-core/google-gemini";
import { CloudClient, type Metadata, type QueryResult } from "chromadb";
import { nanoid } from "nanoid";
import type { Result } from "../types";

export class ChromaUtils {
  private readonly client: CloudClient;
  private readonly embedder: GoogleGeminiEmbeddingFunction;

  constructor() {
    this.client = new CloudClient({
      apiKey: process.env.CHROMA_API_KEY,
      tenant: process.env.CHROMA_TENANT_ID,
      database: "creator-embeddings",
    });
    this.embedder = new GoogleGeminiEmbeddingFunction({
      apiKeyEnvVar: "GOOGLE_GEMINI_API_KEY",
      apiKey: process.env.GOOGLE_GEMINI_API_KEY,
      modelName: "gemini-embedding-001",
    });
  }

  async deleteCollection(name: string) {
    return await this.client.deleteCollection({ name });
  }

  async listCollections() {
    return await this.client.listCollections();
  }

  async loadDocuments(
    documentsData: {
      collectionName: string;
      metadatas: Metadata[];
      documents: string[];
    }[],
  ): Promise<Result<null>> {
    try {
      await Promise.all(
        documentsData.map(async (document) => {
          const collection = await this.client.getOrCreateCollection({
            name: document.collectionName,
            embeddingFunction: this.embedder,
          });

          await collection.add({
            ids: Array.from({ length: document.documents.length }, () =>
              nanoid(),
            ),
            documents: document.documents,
            metadatas: document.metadatas,
          });
        }),
      );

      return { success: true, data: null };
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : `Failed to load document: ${err}`,
      };
    }
  }

  async queryNicheCollection(
    query: string,
    nResults = 10,
  ): Promise<Result<QueryResult<Metadata>>> {
    try {
      const collection = await this.client.getOrCreateCollection({
        name: "niche-summaries",
        embeddingFunction: this.embedder,
      });

      const data = await collection.query({ queryTexts: [query], nResults });

      return { success: true, data };
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : `Failed to query collection: ${err}`,
      };
    }
  }

  async queryStyleCollection(
    query: string,
    nResults = 10,
  ): Promise<Result<QueryResult<Metadata>>> {
    try {
      const collection = await this.client.getOrCreateCollection({
        name: "style-summaries",
        embeddingFunction: this.embedder,
      });

      const data = await collection.query({ queryTexts: [query], nResults });

      return { success: true, data };
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : `Failed to query collection: ${err}`,
      };
    }
  }

  async queryAudienceCollection(
    query: string,
    nResults = 10,
  ): Promise<Result<QueryResult<Metadata>>> {
    try {
      const collection = await this.client.getOrCreateCollection({
        name: "target-audience-summaries",
        embeddingFunction: this.embedder,
      });

      const data = await collection.query({ queryTexts: [query], nResults });

      return { success: true, data };
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : `Failed to query collection: ${err}`,
      };
    }
  }
}
