"use client"

import React, { useRef, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { User, Bot, Clock, Send } from 'lucide-react'
import { MarkdownRenderer } from '@/components/ui/markdown-renderer'
import { AIResponseParser } from '@/lib/xml-parser'
import { InlineLoader } from '@/components/ui/loading-spinner'

interface Prompt {
  id: string
  content: string
  type: "USER" | "SYSTEM"
  createdAt: string
}

interface ConversationMessage {
  id: string
  content: string
  type: "USER" | "ASSISTANT"
  timestamp: string
  isStreaming?: boolean
}

interface ChatInterfaceProps {
  prompts?: Prompt[]
  currentUserQuery?: string
  currentAIResponse?: string
  isGenerating?: boolean
  newPrompt: string
  selectedModel: string
  availableModels: readonly { value: string; label: string }[]
  projectDescription?: string
  onPromptChange: (value: string) => void
  onModelChange: (value: string) => void
  onSubmit: () => void
}

export function ChatInterface({
  prompts = [],
  currentUserQuery,
  currentAIResponse,
  isGenerating = false,
  newPrompt,
  selectedModel,
  availableModels,
  projectDescription,
  onPromptChange,
  onModelChange,
  onSubmit
}: ChatInterfaceProps) {
  const parser = useMemo(() => new AIResponseParser(), [])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Convert prompts to conversation messages
  const messages: ConversationMessage[] = []

  // Sort prompts by creation time to get proper chronological order
  const sortedPrompts = [...prompts].sort((a, b) =>
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )

  // Convert each prompt to a message
  sortedPrompts.forEach((prompt) => {
    let content = prompt.content

    // If this is a SYSTEM prompt (AI response), extract plain text from XML
    if (prompt.type === 'SYSTEM') {
      const parsed = parser.parseResponse(prompt.content, false)
      content = parsed.text || prompt.content
    }

    messages.push({
      id: prompt.id,
      content: content,
      type: prompt.type === 'USER' ? 'USER' : 'ASSISTANT',
      timestamp: prompt.createdAt
    })
  })

  // Add current conversation if active
  if (currentUserQuery) {
    messages.push({
      id: 'current-user',
      content: currentUserQuery,
      type: 'USER',
      timestamp: new Date().toISOString()
    })
  }

  if (currentAIResponse) {
    messages.push({
      id: 'current-ai',
      content: currentAIResponse,
      type: 'ASSISTANT',
      timestamp: new Date().toISOString(),
      isStreaming: isGenerating
    })
  }

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'end',
        inline: 'nearest'
      })
    }

    // Small delay to ensure DOM is updated
    const timeoutId = setTimeout(scrollToBottom, 50)
    return () => clearTimeout(timeoutId)
  }, [messages.length, currentAIResponse])

  // Also scroll to bottom on initial load if there are messages
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({
        behavior: 'auto',
        block: 'end',
        inline: 'nearest'
      })
    }
  }, [messages.length])

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const handleSubmit = () => {
    if (!newPrompt.trim() || isGenerating) return
    onSubmit()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <Card className="border border-border/50 shadow-lg gap-0 bg-card/50 backdrop-blur-sm flex flex-col h-full">
      <CardHeader className="pb-3 flex-shrink-0">
        <CardTitle className="text-xl mb-1 flex items-center gap-2">
          {projectDescription || 'Chat with AI Assistant'}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {messages.length === 0 ? 'Start a conversation to build your project' : `${messages.length} messages`}
        </p>
      </CardHeader>

      {/* Messages Area */}
      <CardContent className="flex-1 min-h-0 p-0 flex flex-col">
        <ScrollArea className="flex-1 px-3 h-full">
          <div>
            {messages.length === 0 ? (
              <div className="flex h-[200px] items-center justify-center">
                <div className="text-center space-y-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border/30 mx-auto">
                    <Bot className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium text-foreground text-sm">Ready to start building</p>
                    <p className="text-xs text-muted-foreground">
                      Describe your Solana project and I&apos;ll help you build it
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`py-1.5 flex gap-2 ${message.type === 'USER' ? 'flex-row-reverse' : 'flex-row'
                    }`}
                >
                  {/* Avatar */}
                  <div className={`flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full ${message.type === 'USER'
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-border'
                    }`}>
                    {message.type === 'USER' ? (
                      <User className="h-3 w-3" />
                    ) : (
                      <Bot className="h-3 w-3" />
                    )}
                  </div>

                  {/* Message Content */}
                  <div className={`flex-1 space-y-1 max-w-[85%] ${message.type === 'USER' ? 'text-right' : 'text-left'
                    }`}>
                    {/* Header */}
                    <div className={`flex items-center gap-2 ${message.type === 'USER' ? 'justify-end' : 'justify-start'
                      }`}>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-2 w-2" />
                        {formatTimestamp(message.timestamp)}
                      </div>
                    </div>

                    {/* Message Bubble */}
                    <div
                      className={`inline-block rounded-lg px-3 py-2 ${message.type === 'USER'
                          ? 'bg-primary text-primary-foreground text-left'
                          : 'border border-border text-left'
                        }`}
                    >
                      {message.type === 'USER' ? (
                        <div className="text-xs leading-relaxed whitespace-pre-wrap break-words text-left">
                          {message.content || 'No content'}
                        </div>
                      ) : (
                        <div className="break-words text-left">
                          {message.content ? (
                            <MarkdownRenderer content={message.content} />
                          ) : message.isStreaming ? (
                            <div className="text-xs text-muted-foreground">Thinking...</div>
                          ) : (
                            <div className="text-xs text-muted-foreground">No content</div>
                          )}
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </CardContent>

      {/* Input Area - At Bottom of Card */}
      <div className="border-t border-border/50 p-2 max-h-[90px] space-y-2 flex-shrink-0">
        {/* Model Selection */}
        <div className="flex items-center gap-2 ">
          <span className="text-xs font-medium text-muted-foreground">Model:</span>
          <Select value={selectedModel} onValueChange={onModelChange} disabled={isGenerating}>
            <SelectTrigger className="w-auto min-w-[120px] h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableModels.map((model) => (
                <SelectItem key={model.value} value={model.value}>
                  <span className="text-xs">{model.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Message Input */}
        <div className="flex gap-2 items-end ">
          <div className="flex-1">
            <Textarea
              ref={textareaRef}
              placeholder="Type your message..."
              value={newPrompt}
              onChange={(e) => onPromptChange(e.target.value)}
              onKeyDown={handleKeyDown}
              className="min-h-[30px] max-h-[50px] resize-none text-xs leading-relaxed"
              disabled={isGenerating}
            />
          </div>
          <Button
            onClick={handleSubmit}
            disabled={!newPrompt.trim() || isGenerating}
            className="min-h-[40px] px-3"
            size="sm"
          >
            {isGenerating ? (
              <InlineLoader size="sm" />
            ) : (
              <Send className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>
    </Card>
  )
} 