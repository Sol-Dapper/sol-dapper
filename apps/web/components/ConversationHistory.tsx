"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { User, Bot, Clock } from "lucide-react";
import { AIResponseParser } from "@/lib/xml-parser";

interface Prompt {
  id: string;
  content: string;
  type: "USER" | "SYSTEM";
  createdAt: string;
}

interface ConversationMessage {
  id: string;
  content: string;
  type: "USER" | "ASSISTANT";
  timestamp: string;
  isStreaming?: boolean;
}

interface ConversationHistoryProps {
  prompts?: Prompt[];
  currentUserQuery?: string;
  currentAIResponse?: string;
  isGenerating?: boolean;
}

export function ConversationHistory({
  prompts = [],
  currentUserQuery,
  currentAIResponse,
  isGenerating = false,
}: ConversationHistoryProps) {
  const parser = new AIResponseParser();

  // Convert prompts to conversation messages
  const messages: ConversationMessage[] = [];

  // Sort prompts by creation time to get proper chronological order
  const sortedPrompts = [...prompts].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // Convert each prompt to a message
  sortedPrompts.forEach((prompt) => {
    let content = prompt.content;

    // If this is a SYSTEM prompt (AI response), extract plain text from XML
    if (prompt.type === "SYSTEM") {
      const parsed = parser.parseResponse(prompt.content, false);
      content = parsed.text || prompt.content;
    }

    messages.push({
      id: prompt.id,
      content: content,
      type: prompt.type === "USER" ? "USER" : "ASSISTANT",
      timestamp: prompt.createdAt,
    });
  });

  // Add current conversation if active
  if (currentUserQuery) {
    messages.push({
      id: "current-user",
      content: currentUserQuery,
      type: "USER",
      timestamp: new Date().toISOString(),
    });
  }

  if (currentAIResponse) {
    messages.push({
      id: "current-ai",
      content: currentAIResponse,
      type: "ASSISTANT",
      timestamp: new Date().toISOString(),
      isStreaming: isGenerating,
    });
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card className="border border-border/50 shadow-lg bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg mb-1 flex items-center gap-2">
          <Bot className="h-5 w-5" />
          Conversation History
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {messages.length === 0
            ? "Start a conversation"
            : `${messages.length} messages`}
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <div className="p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="flex h-[300px] items-center justify-center">
                <div className="text-center space-y-3">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/30 border border-border/30 mx-auto">
                    <Bot className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">
                      No conversation yet
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Send your first message to start building
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div key={message.id} className="flex gap-3 flex-row">
                  {/* Avatar */}
                  <div
                    className={`flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-full ${
                      message.type === "USER"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted border border-border"
                    }`}
                  >
                    {message.type === "USER" ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                  </div>

                  {/* Message Content */}
                  <div className="flex-1 space-y-2 text-left">
                    {/* Header */}
                    <div className="flex items-center gap-2 justify-start">
                      <Badge
                        variant={
                          message.type === "USER" ? "default" : "secondary"
                        }
                        className="text-xs"
                      >
                        {message.type === "USER" ? "You" : "AI Assistant"}
                      </Badge>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatTimestamp(message.timestamp)}
                      </div>
                      {message.isStreaming && (
                        <div className="flex items-center gap-1">
                          <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse"></div>
                          <span className="text-xs text-blue-600 dark:text-blue-400">
                            writing...
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Message Bubble */}
                    <div
                      className={`block max-w-[85%] rounded-lg px-4 py-3 ${
                        message.type === "USER"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted border border-border"
                      }`}
                    >
                      {message.type === "USER" ? (
                        <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                          {message.content || "No content"}
                        </div>
                      ) : (
                        <div className="break-words">
                          {message.content ? (
                            <MarkdownRenderer content={message.content} />
                          ) : message.isStreaming ? (
                            <div className="text-sm text-muted-foreground">
                              Thinking...
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground">
                              No content
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
