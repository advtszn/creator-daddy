/** biome-ignore-all lint/suspicious/noArrayIndexKey: <explanation> */
"use client";

import { useChat } from "@ai-sdk/react";
import { CheckCircleIcon, LoaderIcon, SearchIcon } from "lucide-react";
import { useState } from "react";
import type { ChatMessage } from "~/ai/tools";
import type { Creator } from "~/types";

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "~/components/ai-elements/conversation";
import { MessageResponse } from "~/components/ai-elements/message";
import { CreatorGrid } from "~/components/creator-card";

export default function Home() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status } = useChat<ChatMessage>();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage({ text: input });
    setInput("");
  };

  return (
    <main className="flex h-screen flex-col">
      <Conversation className="flex-1">
        {messages.length === 0 ? (
          <ConversationEmptyState className="items-start justify-start p-4 pt-24 text-left">
            <h1 className="from-foreground to-background/0 max-w-1/2 bg-linear-to-br bg-clip-text text-6xl font-bold text-transparent">
              Looking for a creator? <br /> Daddy can fix you
            </h1>
          </ConversationEmptyState>
        ) : (
          <ConversationContent className="max-w-5xl pb-24 pt-24">
            {messages.map((message, idx) => (
              <div key={idx} className="flex flex-col gap-2">
                <span className="text-muted-foreground text-sm">
                  {message.role === "user" ? "You" : "Daddy"}
                </span>
                {message.parts.map((part, index) => {
                  switch (part.type) {
                    case "text":
                      return (
                        <MessageResponse key={index} className="text-lg">
                          {part.text}
                        </MessageResponse>
                      );

                    case "tool-getCreators": {
                      const { state, input: toolInput } = part;

                      if (
                        state === "input-streaming" ||
                        state === "input-available"
                      ) {
                        return (
                          <div
                            key={index}
                            className="flex items-center gap-2 text-muted-foreground text-sm"
                          >
                            <LoaderIcon className="size-4 animate-spin" />
                            <span>Searching for "{toolInput?.query}"...</span>
                          </div>
                        );
                      }

                      if (state === "output-available") {
                        const output = part.output;

                        return (
                          <div key={index} className="flex flex-col gap-3">
                            <div className="flex items-center gap-2 text-muted-foreground text-sm">
                              <CheckCircleIcon className="size-4 text-green-500" />
                            </div>
                            <CreatorGrid creators={output.creators as Creator[]} />
                          </div>
                        );
                      }

                      if (state === "output-error") {
                        return (
                          <div key={index} className="text-destructive text-sm">
                            Error: {part.errorText}
                          </div>
                        );
                      }

                      return null;
                    }

                    default:
                      return null;
                  }
                })}
              </div>
            ))}
          </ConversationContent>
        )}
        <ConversationScrollButton />
      </Conversation>

      <form
        onSubmit={handleSubmit}
        className="bg-background fixed inset-x-0 bottom-0"
      >
        <div className="relative">
          <SearchIcon className="absolute top-1/2 left-6 size-5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe the creator you're looking for..."
            disabled={status !== "ready"}
            className="border-foreground/20 w-full border-t bg-transparent py-6 pr-6 pl-14 outline-none disabled:opacity-50"
          />
        </div>
      </form>
    </main>
  );
}
