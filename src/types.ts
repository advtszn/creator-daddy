export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Base social media profile data from MongoDB
 */
export interface SocialProfile {
  _id: string;
  creatorName: string;
  handle: string;
  platformId: string;
  followersCount: number;
  profileImage: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Creator with similarity summaries and weighted score
 */
export interface Creator extends SocialProfile {
  nicheSummary?: string;
  styleSummary?: string;
  audienceSummary?: string;
  weightedSimilarity: number;
}

/**
 * Tool output types
 */
export type GetCreatorsToolOutput =
  | { success: true; creators: Creator[] }
  | { success: false; error: string; creators: [] };
