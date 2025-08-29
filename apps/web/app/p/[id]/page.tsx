"use client"

import { useParams } from "next/navigation"
import { usePrivy } from "@privy-io/react-auth"
import { useState, useEffect, type JSX } from "react"
import { Button } from "../../../components/ui/button"
import { Textarea } from "../../../components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card"
import { Separator } from "../../../components/ui/separator"
import { Badge } from "../../../components/ui/badge"
import { ScrollArea } from "../../../components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select"
import { Send, Loader2, AlertCircle, ArrowLeft, Calendar } from "lucide-react"
import Link from "next/link"

interface Prompt {
  id: string
  content: string
  type: "USER" | "SYSTEM"
  createdAt: string
}

interface Project {
  id: string
  description: string
  userId: string
  createdAt: string
  updatedAt: string
  prompts: Prompt[]
}

const AVAILABLE_MODELS = [
  { value: "gpt-4o", label: "GPT-4o (Latest)" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini" },
  { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
  { value: "gpt-4", label: "GPT-4" },
  { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
  { value: "claude-3-7-sonnet-20250219", label: "Claude 3.7 Sonnet" },
  { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
] as const

export default function ProjectPage(): JSX.Element {
  const params = useParams()
  const { getAccessToken, authenticated, user } = usePrivy()
  const projectId = params?.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>("")
  const [newPrompt, setNewPrompt] = useState<string>("")
  const [selectedModel, setSelectedModel] = useState<string>("gpt-4o")
  const [isGenerating, setIsGenerating] = useState<boolean>(false)
  const [streamingResponse, setStreamingResponse] = useState<string>("")

  useEffect(() => {
    if (authenticated && projectId) {
      loadProject()
    }
  }, [authenticated, projectId])

  const loadProject = async (): Promise<void> => {
    try {
      setLoading(true)
      setError("")
      const token = await getAccessToken()
      if (!token) {
        setError("Failed to get authentication token")
        return
      }
      const response = await fetch(`http://localhost:3001/project/${projectId}`, {
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || errorData.message || response.statusText
        throw new Error(errorMessage)
      }
      const projectData: Project = await response.json()
      setProject(projectData)
    } catch (err) {
      console.error("Error loading project:", err)
      setError(err instanceof Error ? err.message : "Failed to load project")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (): Promise<void> => {
    if (!newPrompt.trim() || isGenerating || !project) return
    setIsGenerating(true)
    setStreamingResponse("")
    setError("")

    try {
      const token = await getAccessToken()
      if (!token) {
        throw new Error("Failed to get authentication token")
      }

      const chatResponse = await fetch("http://localhost:3001/chat", {
        method: "POST",
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: newPrompt,
          projectId: project.id,
          model: selectedModel,
        }),
      })

      if (!chatResponse.ok) {
        const errorData = await chatResponse.json().catch(() => ({}))
        const errorMessage = errorData.error || errorData.message || chatResponse.statusText
        throw new Error(`Failed to get AI response: ${errorMessage}`)
      }

      const reader = chatResponse.body?.getReader()
      const decoder = new TextDecoder()
      if (!reader) throw new Error("No response stream available")

      setStreamingResponse("")
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })
          setStreamingResponse((prev) => prev + chunk)
        }
      } finally {
        reader.releaseLock()
      }

      await loadProject()
      setNewPrompt("")
    } catch (err) {
      console.error("Error sending prompt:", err)
      setError(err instanceof Error ? err.message : "Failed to process request")
      setStreamingResponse("❌ Error occurred. Please try again.")
    } finally {
      setIsGenerating(false)
    }
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="w-full max-w-md rounded-lg">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Please log in to view this project.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="w-full max-w-md rounded-lg">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading project...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="w-full max-w-md rounded-lg">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-4" />
            <p className="text-destructive mb-4">{error}</p>
            <Link href="/">
              <Button>Go Back Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 md:px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="text-2xl">⚡</div>
              <div>
                <h1 className="text-xl font-bold">Sol-Dapper</h1>
                <p className="text-sm text-muted-foreground">Project: {project?.description}</p>
              </div>
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            {user?.wallet?.address ? (
              <span className="font-mono bg-accent px-2 py-1 rounded">
                {user.wallet.address.slice(0, 8)}...{user.wallet.address.slice(-8)}
              </span>
            ) : (
              user?.email?.address || "Connected"
            )}
          </div>
        </div>
      </header>

      {/* Main: v0-style skeleton with history on the right */}
      <div className="h-[calc(100vh-64px)] p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left Column: Input only */}
        <div className="flex flex-col h-full min-h-0">
          <Card className="rounded-lg h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Continue Working</CardTitle>
              <p className="text-sm text-muted-foreground">Ask questions or request changes</p>
            </CardHeader>
            <Separator />
            <CardContent className="pt-4 space-y-4">
              <div>
                <label htmlFor="prompt" className="block text-sm font-medium mb-2">
                  Your Message
                </label>
                <Textarea
                  id="prompt"
                  placeholder="Ask a question, request changes, or add new features..."
                  value={newPrompt}
                  onChange={(e) => setNewPrompt(e.target.value)}
                  className="min-h-[120px] resize-none"
                  disabled={isGenerating}
                />
              </div>

              <div>
                <label htmlFor="model" className="block text-sm font-medium mb-2">
                  Model
                </label>
                <Select value={selectedModel} onValueChange={setSelectedModel} disabled={isGenerating}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_MODELS.map((model) => (
                      <SelectItem key={model.value} value={model.value}>
                        {model.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleSubmit} disabled={!newPrompt.trim() || isGenerating} className="w-full" size="lg">
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Message
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: AI Response + Conversation History */}
        <div className="flex flex-col h-full min-h-0 gap-4">
          {/* AI Response */}
          <Card className="rounded-lg flex-1 min-h-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">AI Response</CardTitle>
            </CardHeader>
            <Separator />
            <CardContent className="h-full min-h-0 p-0">
              <ScrollArea className="h-full p-4">
                {streamingResponse ? (
                  <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans">{streamingResponse}</pre>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="text-muted-foreground text-6xl mb-4">💬</div>
                      <p className="text-sm text-muted-foreground">AI response will appear here</p>
                    </div>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Conversation History */}
          <Card className="rounded-lg flex-1 min-h-0">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Conversation History</CardTitle>
                <Badge variant="secondary">{project?.prompts.length || 0} messages</Badge>
              </div>
              <div className="flex items-center text-sm text-muted-foreground gap-4 mt-1">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>Created: {project ? new Date(project.createdAt).toLocaleDateString() : ""}</span>
                </div>
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="h-full min-h-0 p-0">
              <ScrollArea className="h-full p-4">
                <div className="space-y-3">
                  {project?.prompts.map((prompt) => (
                    <Card
                      key={prompt.id}
                      className={`rounded-md transition-colors cursor-pointer hover:bg-accent ${
                        prompt.type === "USER" ? "ml-6" : "mr-6"
                      }`}
                      title="Click to use this as context"
                      onClick={() => setNewPrompt((prev) => (prev ? `${prev}\n\n${prompt.content}` : prompt.content))}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant={prompt.type === "USER" ? "default" : "secondary"} className="text-xs">
                            {prompt.type === "USER" ? "👤 You" : "🤖 AI"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(prompt.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans">{prompt.content}</pre>
                      </CardContent>
                    </Card>
                  ))}

                  {project?.prompts.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-sm text-muted-foreground">No conversation yet. Start by sending a message!</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
