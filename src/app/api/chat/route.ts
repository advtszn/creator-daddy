import { groq } from "@ai-sdk/groq";
import { convertToModelMessages, stepCountIs, streamText } from "ai";
import { type ChatMessage, tools } from "~/ai/tools";

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: ChatMessage[] } = await req.json();

  const result = streamText({
    model: groq("openai/gpt-oss-120b"),
    system: `You are a helpful assistant that helps users find instagram creators and influencers.
When a user asks about finding creators, influencers, or content makers, use the getCreators tool to search for them.
Present the results in a clear, organized way, highlighting the most relevant creators based on their query.`,
    messages: await convertToModelMessages(messages),
    tools,
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse();
}
