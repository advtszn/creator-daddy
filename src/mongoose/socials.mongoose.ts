import mongoose, { type Document, Schema } from "mongoose";

export interface ISocials extends Document {
  creatorName: string;
  handle: string;
  platformId: string;
  followersCount: number;
  profileImage: string;
}

const SocialsSchema = new Schema<ISocials>(
  {
    creatorName: { type: String, required: true },
    handle: { type: String, required: true, unique: true },
    platformId: { type: String, required: true, unique: true },
    followersCount: { type: Number, required: true },
    profileImage: { type: String, required: true },
  },
  { timestamps: true },
);

export const Socials =
  mongoose.models.Socials || mongoose.model<ISocials>("Socials", SocialsSchema);
