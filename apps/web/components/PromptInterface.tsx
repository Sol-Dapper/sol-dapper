"use client"

import { useState, useEffect, useCallback, type JSX } from "react"
import { usePrivy } from "@privy-io/react-auth"
import { useRouter } from "next/navigation"
import { Button } from "./ui/button"
import { Textarea } from "./ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Separator } from "./ui/separator"
import { ScrollArea } from "./ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Label } from "./ui/label"
import { Send, Loader2, AlertCircle, Zap } from "lucide-react"
import { ProjectsSidebar } from "./ProjectsSidebar"
import { AIResponseRenderer } from "./AIResponseRenderer"

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
  { value: "gpt-4o", label: "GPT-4o"},
  { value: "gpt-4o-mini", label: "GPT-4o Mini" },
  { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
  { value: "gpt-4", label: "GPT-4" },
  { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
  { value: "claude-3-7-sonnet-20250219", label: "Claude 3.7 Sonnet"},
  { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
] as const

export function PromptInterface(): JSX.Element {
  const { getAccessToken } = usePrivy()
  const router = useRouter()
  const [prompt, setPrompt] = useState<string>("")
  const [selectedModel, setSelectedModel] = useState<string>("gpt-4o")
  const [projects, setProjects] = useState<ProjectWithStatus[]>([])
  const [isGenerating, setIsGenerating] = useState<boolean>(false)
  const [streamingResponse, setStreamingResponse] = useState<string>("")
  const [error, setError] = useState<string>("")
  const [isLoadingProjects, setIsLoadingProjects] = useState<boolean>(false)

  const loadProjects = useCallback(async (): Promise<void> => {
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
  }, [getAccessToken])

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

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

      setProjects((prev) => prev.map((p) => (p.id === projectId ? { ...p, status: "generating" as ProjectStatus } : p)))
      
      // Navigate to the project page with initial prompt and model for seamless continuation
      setStreamingResponse((prev) => prev + "\n🔄 Redirecting to project page...")
      setTimeout(() => {
        // Keep loading state active during navigation
        router.push(`/p/${projectId}?initialPrompt=${encodeURIComponent(prompt)}&model=${selectedModel}`)
      }, 500) // Reduced delay since loading continues on project page
      
      // Don't set isGenerating to false here - let the navigation handle it
      return
    } catch (err) {
      console.error("Error in project creation:", err)
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
      setStreamingResponse("❌ Generation failed. Please try again.")
      setProjects((prev) => prev.map((p) => (p.id === tempProject.id ? { ...p, status: "error" as ProjectStatus } : p)))
      setIsGenerating(false)
    }

    setPrompt("")
  }



  return (
    <div className="min-h-[calc(100vh-100px)] bg-background">
      <ProjectsSidebar 
        projects={projects}
        isLoadingProjects={isLoadingProjects}
        onLoadProjects={loadProjects}
      />
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
                        </div>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {AVAILABLE_MODELS.map((model) => (
                        <SelectItem key={model.value} value={model.value} className="py-4">
                          <div className="flex flex-col gap-2">
                            <span className="font-medium text-base">{model.label}</span>
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

          {/* Right Column - Output */}
          <div className="flex min-h-0 flex-col">
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
                      <AIResponseRenderer 
                        response={streamingResponse} 
                        useBoilerplate={true} // Always use boilerplate for new projects
                        isStreaming={isGenerating}
                      />
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
          </div>
        </div>
      </div>
    </div>
  )
}
