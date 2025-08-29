"use client"

import { useState, useEffect, type JSX } from "react"
import { usePrivy } from "@privy-io/react-auth"
import { Button } from "./ui/button"
import { Textarea } from "./ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Separator } from "./ui/separator"
import { Badge } from "./ui/badge"
import { ScrollArea } from "./ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Send, Loader2, AlertCircle } from "lucide-react"
import Link from "next/link"

interface Project {
  id: string
  description: string
  userId: string
  createdAt: string
  updatedAt: string
}

type ProjectStatus = "creating" | "generating" | "completed" | "error"

interface ProjectWithStatus extends Project {
  status?: ProjectStatus
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

export function PromptInterface(): JSX.Element {
  const { getAccessToken } = usePrivy()
  const [prompt, setPrompt] = useState<string>("")
  const [selectedModel, setSelectedModel] = useState<string>("gpt-4o")
  const [projects, setProjects] = useState<ProjectWithStatus[]>([])
  const [isGenerating, setIsGenerating] = useState<boolean>(false)
  const [streamingResponse, setStreamingResponse] = useState<string>("")
  const [error, setError] = useState<string>("")

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async (): Promise<void> => {
    try {
      const token = await getAccessToken()
      if (!token) {
        setError("Failed to get authentication token")
        return
      }

      const response = await fetch("http://localhost:3001/projects", {
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || errorData.message || response.statusText
        throw new Error(`Failed to load projects: ${errorMessage}`)
      }

      const projectsData: Project[] = await response.json()
      setProjects(projectsData.map((p) => ({ ...p, status: "completed" })))
    } catch (err) {
      console.error("Error loading projects:", err)
      setError(err instanceof Error ? err.message : "Failed to load projects")
    }
  }

  const handleSubmit = async (): Promise<void> => {
    if (!prompt.trim() || isGenerating) return

    setIsGenerating(true)
    setStreamingResponse("")
    setError("")

    const tempProject: ProjectWithStatus = {
      id: `temp-${Date.now()}`,
      description: prompt.split("\n")[0] || prompt,
      userId: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "creating",
    }

    setProjects((prev) => [tempProject, ...prev])

    try {
      const token = await getAccessToken()
      if (!token) {
        throw new Error("Failed to get authentication token")
      }

      setStreamingResponse("🚀 Creating project...\n\n")

      const projectResponse = await fetch("http://localhost:3001/project", {
        method: "POST",
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      })

      if (!projectResponse.ok) {
        const errorData = await projectResponse.json().catch(() => ({}))
        const errorMessage = errorData.error || errorData.message || projectResponse.statusText
        throw new Error(`Failed to create project: ${errorMessage}`)
      }

      const projectResult = await projectResponse.json()
      const projectId = projectResult.project

      setStreamingResponse((prev) => prev + "✅ Project created successfully!\n\n")
      setStreamingResponse((prev) => prev + `📝 Project ID: ${projectId}\n`)
      setStreamingResponse((prev) => prev + `📋 Description: ${prompt.split("\n")[0]}\n\n`)
      setStreamingResponse((prev) => prev + "🤖 Generating AI response...\n\n")

      setProjects((prev) =>
        prev.map((p) =>
          p.id === tempProject.id
            ? {
                ...p,
                id: projectId,
                status: "generating" as ProjectStatus,
              }
            : p,
        ),
      )

      const chatResponse = await fetch("http://localhost:3001/chat", {
        method: "POST",
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          projectId,
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

      if (!reader) {
        throw new Error("No response stream available")
      }

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

      setProjects((prev) => prev.map((p) => (p.id === projectId ? { ...p, status: "completed" as ProjectStatus } : p)))
    } catch (err) {
      console.error("Error in project creation and chat:", err)
      setError(err instanceof Error ? err.message : "Failed to process request")
      setStreamingResponse("❌ Error occurred. Please try again.")

      setProjects((prev) => prev.map((p) => (p.id === tempProject.id ? { ...p, status: "error" as ProjectStatus } : p)))
    } finally {
      setIsGenerating(false)
    }

    setPrompt("")
  }

  const getStatusColor = (status: ProjectStatus = "completed"): string => {
    switch (status) {
      case "creating":
        return "bg-yellow-500"
      case "generating":
        return "bg-blue-500"
      case "completed":
        return "bg-green-500"
      case "error":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  const getStatusText = (status: ProjectStatus = "completed"): string => {
    switch (status) {
      case "creating":
        return "Creating"
      case "generating":
        return "Generating"
      case "completed":
        return "Ready"
      case "error":
        return "Error"
      default:
        return "Unknown"
    }
  }

  return (
    <div className="h-[calc(100vh-64px)] grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-background">
      {/* Left Column - Input only */}
      <div className="flex flex-col h-full min-h-0">
        <Card className="rounded-lg h-full">
          <CardHeader>
            <CardTitle className="text-balance">Create Solana App</CardTitle>
            <p className="text-sm text-muted-foreground">Describe your app and we&apos;ll generate it</p>
          </CardHeader>
          <Separator />
          <CardContent className="space-y-4 pt-4">
            <div>
              <label htmlFor="prompt" className="block text-sm font-medium mb-2">
                Project Description
              </label>
              <Textarea
                id="prompt"
                placeholder="Describe the Solana application you want to create..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[160px] resize-none"
                disabled={isGenerating}
              />
            </div>

            <div>
              <label htmlFor="model" className="block text-sm font-medium mb-2">
                Model
              </label>
              <Select value={selectedModel} onValueChange={setSelectedModel} disabled={isGenerating}>
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={AVAILABLE_MODELS.find((m) => m.value === selectedModel)?.label || "Select a model"}
                  />
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

            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}

            <Button onClick={handleSubmit} disabled={!prompt.trim() || isGenerating} className="w-full" size="lg">
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Project...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Create Project
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Right Column - Output + Recent Projects */}
      <div className="flex flex-col h-full min-h-0 gap-4">
        {/* Output */}
        <Card className="rounded-lg flex-1 min-h-0 flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-balance">Generation Output</CardTitle>
            <p className="text-sm text-muted-foreground">Real-time project creation progress</p>
          </CardHeader>
          <Separator />
          <CardContent className="flex-1 min-h-0 p-0">
            <ScrollArea className="h-full p-4">
              {streamingResponse ? (
                <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">{streamingResponse}</pre>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="text-muted-foreground text-6xl mb-4">⚡</div>
                    <p className="text-sm text-muted-foreground">
                      Start creating a project to see the generation output here
                    </p>
                  </div>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Recent Projects (moved to right) */}
        <Card className="rounded-lg min-h-0">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Recent Conversations</CardTitle>
              <Button variant="ghost" size="sm" onClick={loadProjects}>
                Refresh
              </Button>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="p-0 min-h-0">
            <ScrollArea className="h-[260px] p-4">
              <div className="space-y-3">
                {projects.map((project) => (
                  <Link key={project.id} href={`/p/${project.id}`}>
                    <Card className="cursor-pointer hover:bg-accent transition-colors rounded-md">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <Badge className={`${getStatusColor(project.status)} text-white text-xs`}>
                            {getStatusText(project.status)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(project.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm line-clamp-2">{project.description}</p>
                        <p className="text-xs text-muted-foreground mt-1 font-mono">ID: {project.id}</p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}

                {projects.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">No conversations yet.</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
