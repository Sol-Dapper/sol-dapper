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
import { Label } from "./ui/label"
import { Skeleton } from "./ui/skeleton"
import { Send, Loader2, AlertCircle, History, Zap, RefreshCw, ExternalLink, Clock, CheckCircle, XCircle } from "lucide-react"
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
  { value: "gpt-4o", label: "GPT-4o", description: "Latest OpenAI model" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini", description: "Faster, cost-effective" },
  { value: "gpt-4-turbo", label: "GPT-4 Turbo", description: "High performance" },
  { value: "gpt-4", label: "GPT-4", description: "Reliable choice" },
  { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo", description: "Quick responses" },
  { value: "claude-3-7-sonnet-20250219", label: "Claude 3.7 Sonnet", description: "Advanced reasoning" },
  { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4", description: "Latest Claude model" },
] as const

export function PromptInterface(): JSX.Element {
  const { getAccessToken } = usePrivy()
  const [prompt, setPrompt] = useState<string>("")
  const [selectedModel, setSelectedModel] = useState<string>("gpt-4o")
  const [projects, setProjects] = useState<ProjectWithStatus[]>([])
  const [isGenerating, setIsGenerating] = useState<boolean>(false)
  const [streamingResponse, setStreamingResponse] = useState<string>("")
  const [error, setError] = useState<string>("")
  const [isLoadingProjects, setIsLoadingProjects] = useState<boolean>(false)

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async (): Promise<void> => {
    setIsLoadingProjects(true)
    try {
      const token = await getAccessToken()
      if (!token) {
        setError("Authentication required")
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
      setError("")
    } catch (err) {
      console.error("Error loading projects:", err)
      setError(err instanceof Error ? err.message : "Failed to load projects")
    } finally {
      setIsLoadingProjects(false)
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
        throw new Error("Authentication required")
      }

      setStreamingResponse("🚀 Initializing project creation...\n\n")

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
        throw new Error(`Project creation failed: ${errorMessage}`)
      }

      const projectResult = await projectResponse.json()
      const projectId = projectResult.project

      setStreamingResponse((prev) => prev + "✅ Project created successfully\n\n")
      setStreamingResponse((prev) => prev + `📋 Project: ${prompt.split("\n")[0]}\n`)
      setStreamingResponse((prev) => prev + `🆔 ID: ${projectId}\n\n`)
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
        throw new Error(`AI generation failed: ${errorMessage}`)
      }

      const reader = chatResponse.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error("Response stream unavailable")
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
      console.error("Error in project creation:", err)
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
      setStreamingResponse("❌ Generation failed. Please try again.")
      setProjects((prev) => prev.map((p) => (p.id === tempProject.id ? { ...p, status: "error" as ProjectStatus } : p)))
    } finally {
      setIsGenerating(false)
    }

    setPrompt("")
  }

  const getStatusIcon = (status: ProjectStatus = "completed") => {
    switch (status) {
      case "creating":
        return <Loader2 className="h-3 w-3 animate-spin text-amber-500" />
      case "generating":
        return <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
      case "completed":
        return <CheckCircle className="h-3 w-3 text-green-500" />
      case "error":
        return <XCircle className="h-3 w-3 text-red-500" />
      default:
        return <CheckCircle className="h-3 w-3 text-muted-foreground" />
    }
  }

  const getStatusColor = (status: ProjectStatus = "completed"): string => {
    switch (status) {
      case "creating":
        return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300"
      case "generating":
        return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300"
      case "completed":
        return "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300"
      case "error":
        return "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
      default:
        return "border-border bg-muted text-muted-foreground"
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
        return "Failed"
      default:
        return "Unknown"
    }
  }

  return (
    <div className="min-h-[calc(100vh-100px)] bg-background">
      <div className="mx-auto px-12 py-12">
        <div className="grid h-full grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Left Column - Input */}
          <div className="flex min-h-0 flex-col">
            <Card className="h-full border border-border/50 shadow-lg bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
                    <Zap className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl mb-2">Create Solana App</CardTitle>
                    <p className="text-muted-foreground leading-relaxed">
                      Describe your application and AI will generate it for you
                    </p>
                  </div>
                </div>
              </CardHeader>
              <Separator className="mx-6" />
              <CardContent className="flex-1 space-y-8 pt-8">
                <div className="space-y-4">
                  <Label htmlFor="prompt" className="text-base font-medium">
                    Project Description
                  </Label>
                  <Textarea
                    id="prompt"
                    placeholder="Describe the Solana application you want to create. Be specific about features, functionality, and any technical requirements..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="min-h-[200px] resize-none border-border/50 focus:border-primary/50 text-base leading-relaxed"
                    disabled={isGenerating}
                  />
                  <p className="text-sm text-muted-foreground">
                    {prompt.length}/2000 characters
                  </p>
                </div>

                <div className="space-y-4">
                  <Label htmlFor="model" className="text-base font-medium">
                    AI Model
                  </Label>
                  <Select value={selectedModel} onValueChange={setSelectedModel} disabled={isGenerating}>
                    <SelectTrigger className="w-full border-border/50 h-12">
                      <SelectValue>
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{AVAILABLE_MODELS.find((m) => m.value === selectedModel)?.label}</span>
                          <span className="text-sm text-muted-foreground">
                            • {AVAILABLE_MODELS.find((m) => m.value === selectedModel)?.description}
                          </span>
                        </div>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {AVAILABLE_MODELS.map((model) => (
                        <SelectItem key={model.value} value={model.value} className="py-4">
                          <div className="flex flex-col gap-2">
                            <span className="font-medium text-base">{model.label}</span>
                            <span className="text-sm text-muted-foreground">{model.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {error && (
                  <div className="flex items-start gap-4 rounded-xl border border-destructive/20 bg-destructive/10 p-5">
                    <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                    <div className="space-y-2">
                      <p className="font-medium text-destructive">Error</p>
                      <p className="text-sm text-destructive/80 leading-relaxed">{error}</p>
                    </div>
                  </div>
                )}

                <Button 
                  onClick={handleSubmit} 
                  disabled={!prompt.trim() || isGenerating || prompt.length > 2000} 
                  className="w-full h-14 text-lg font-medium"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Send className="mr-3 h-6 w-6" />
                      Create Application
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Output + Recent Projects */}
          <div className="flex min-h-0 flex-col gap-8">
            {/* Output */}
            <Card className="flex min-h-0 flex-1 flex-col border border-border/50 shadow-lg bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
                    <Zap className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl mb-2">Generation Output</CardTitle>
                    <p className="text-muted-foreground leading-relaxed">
                      Real-time progress and results from AI generation
                    </p>
                  </div>
                </div>
              </CardHeader>
              <Separator className="mx-6" />
              <CardContent className="min-h-0 flex-1 p-0">
                <ScrollArea className="h-full">
                  <div className="p-8">
                    {streamingResponse ? (
                      <div className="space-y-4">
                        <div className="rounded-2xl border border-border/30 bg-muted/20 p-6">
                          <pre className="whitespace-pre-wrap text-base font-mono leading-relaxed text-foreground">
                            {streamingResponse}
                          </pre>
                        </div>
                      </div>
                    ) : (
                      <div className="flex h-[350px] items-center justify-center">
                        <div className="text-center space-y-6">
                          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-muted/30 border border-border/30 mx-auto">
                            <Zap className="h-10 w-10 text-muted-foreground" />
                          </div>
                          <div className="space-y-3">
                            <p className="font-semibold text-foreground text-xl">Ready to Generate</p>
                            <p className="text-muted-foreground max-w-md leading-relaxed">
                              Describe your Solana application and watch as AI generates your project in real-time with detailed progress updates
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Recent Projects */}
            <Card className="min-h-0 border border-border/50 shadow-lg bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
                      <History className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl mb-2">Recent Projects</CardTitle>
                      <p className="text-muted-foreground leading-relaxed">
                        Your project history and conversations
                      </p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={loadProjects}
                    disabled={isLoadingProjects}
                    className="h-10 w-10 p-0 hover:bg-muted/50"
                  >
                    <RefreshCw className={`h-5 w-5 ${isLoadingProjects ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </CardHeader>
              <Separator className="mx-6" />
              <CardContent className="min-h-0 p-0">
                <ScrollArea className="h-[320px]">
                  <div className="p-8 space-y-4">
                    {isLoadingProjects ? (
                      <div className="space-y-4">
                        {[...Array(3)].map((_, i) => (
                          <Card key={i} className="border-border/30">
                            <CardContent className="p-5">
                              <div className="mb-4 flex items-center justify-between">
                                <Skeleton className="h-6 w-16" />
                                <Skeleton className="h-4 w-20" />
                              </div>
                              <Skeleton className="h-4 w-full mb-2" />
                              <Skeleton className="h-4 w-3/4 mb-3" />
                              <Skeleton className="h-6 w-32" />
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <>
                        {projects.map((project) => (
                          <Link key={project.id} href={`/p/${project.id}`}>
                            <Card className="group cursor-pointer transition-all hover:bg-muted/30 hover:border-primary/20 border-border/30 hover:shadow-md">
                              <CardContent className="p-5">
                                <div className="mb-4 flex items-center justify-between">
                                  <Badge 
                                    variant="outline"
                                    className={`${getStatusColor(project.status)} border text-sm font-medium px-3 py-1`}
                                  >
                                    <div className="flex items-center gap-2">
                                      {getStatusIcon(project.status)}
                                      {getStatusText(project.status)}
                                    </div>
                                  </Badge>
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Clock className="h-4 w-4" />
                                    <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                                    <ExternalLink className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </div>
                                </div>
                                <p className="line-clamp-2 text-base text-foreground mb-3 leading-relaxed">
                                  {project.description}
                                </p>
                                <Badge variant="secondary" className="font-mono text-xs">
                                  {project.id}
                                </Badge>
                              </CardContent>
                            </Card>
                          </Link>
                        ))}

                        {projects.length === 0 && !isLoadingProjects && (
                          <div className="py-16 text-center">
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/30 border border-border/30 mx-auto mb-6">
                              <History className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <p className="font-semibold text-foreground mb-2 text-lg">No projects yet</p>
                            <p className="text-muted-foreground leading-relaxed">
                              Start creating your first Solana application to see it here
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
