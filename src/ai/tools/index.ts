import type { InferUITools, ToolSet, UIDataTypes, UIMessage } from "ai";
import { getCreatorsTool } from "./get-creators.tool.ai";

export const tools = {
  getCreators: getCreatorsTool,
} satisfies ToolSet;

export type ChatTools = InferUITools<typeof tools>;
export type ChatMessage = UIMessage<never, UIDataTypes, ChatTools>;
