import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  serverExternalPackages: [
    "chromadb",
    "@chroma-core/google-gemini",
    "mongoose",
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "scontent-ams2-1.cdninstagram.com",
      },
    ],
  },
};

export default nextConfig;
