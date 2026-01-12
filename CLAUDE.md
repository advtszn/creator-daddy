# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run lint     # Run Biome linter (biome check)
npm run format   # Format code with Biome (biome format --write)
```

## Architecture

This is a Next.js 16 app using the App Router that helps users find Instagram creators/influencers through natural language search.

### Core Flow

1. User enters a search query in the chat interface (`src/app/page.tsx`)
2. Query is sent to `/api/chat` which uses Groq's LLM with the `getCreators` AI tool
3. The tool queries three ChromaDB collections (niche, style, audience) for semantic search
4. Results are merged, weighted by similarity scores, and reranked using Voyage AI
5. Creator metadata is fetched from MongoDB and returned to the client

### Key Components

**AI Tools** (`src/ai/tools/`)
- Tools follow the pattern `*.tool.ai.ts` and are registered in `index.ts`
- `getCreatorsTool`: Main search tool with weighted similarity scoring (niche: 0.4, style: 0.35, audience: 0.25)

**Database Layer**
- MongoDB via Mongoose (`src/mongoose/`): Stores creator social profiles
- ChromaDB (`src/utils/chroma.utils.ts`): Vector store with three collections for semantic search
  - `niche-summaries`, `style-summaries`, `target-audience-summaries`
- Uses Google Gemini embeddings (`gemini-embedding-001`)

**AI/ML Services**
- Gemini LLM (`gemini-3-flash-preview`) for chat
- Voyage AI (`rerank-2.5`) for result reranking
- TOON format encoding for document serialization before reranking

**UI Components**
- `src/components/ui/`: Radix-based shadcn/ui components
- `src/components/ai-elements/`: AI chat interface components (Conversation, Message, etc.)

### Type Patterns

- Result type for error handling: `Result<T> = { success: true; data: T } | { success: false; error: string }`
- Path alias: `~/` maps to `./src/`

### Environment Variables Required

- `MONGODB_URI`: MongoDB connection string
- `CHROMA_API_KEY`, `CHROMA_TENANT_ID`: ChromaDB cloud credentials
- `GOOGLE_GEMINI_API_KEY`: For embeddings and LLM
- `VOYAGEAI_API_KEY`: For reranking
