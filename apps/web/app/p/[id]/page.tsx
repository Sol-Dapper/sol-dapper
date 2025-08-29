"use client"

import { useParams, useSearchParams, useRouter } from "next/navigation"
import { usePrivy } from "@privy-io/react-auth"
import { useState, useEffect, type JSX } from "react"
import { Button } from "../../../components/ui/button"
import { Textarea } from "../../../components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card"
import { Separator } from "../../../components/ui/separator"
import { Badge } from "../../../components/ui/badge"
import { ScrollArea } from "../../../components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select"
import { Navigation } from "../../../components/navigation"
import { ProjectsSidebar } from "../../../components/ProjectsSidebar"
import { Send, Loader2, AlertCircle, Calendar } from "lucide-react"
import Link from "next/link"
import { Label } from "../../../components/ui/label"

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

type ProjectStatus = "creating" | "generating" | "completed" | "error"

interface ProjectWithStatus extends Omit<Project, 'prompts'> {
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

export default function ProjectPage(): JSX.Element {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { getAccessToken, authenticated, user, logout, ready } = usePrivy()
  const projectId = params?.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>("")
  const [newPrompt, setNewPrompt] = useState<string>("")
  const [selectedModel, setSelectedModel] = useState<string>("gpt-4o")
  const [isGenerating, setIsGenerating] = useState<boolean>(false)
  const [streamingResponse, setStreamingResponse] = useState<string>("")

  // Projects state for sidebar
  const [projects, setProjects] = useState<ProjectWithStatus[]>([])
  const [isLoadingProjects, setIsLoadingProjects] = useState<boolean>(false)

  useEffect(() => {
    if (authenticated && projectId) {
      loadProject()
      loadProjects()
    }
  }, [authenticated, projectId])

  // Handle initial AI generation from URL parameters
  useEffect(() => {
    if (project && !isGenerating) {
      const initialPrompt = searchParams.get('initialPrompt')
      const model = searchParams.get('model')
      
      if (initialPrompt && model) {
        // Set the model and start AI generation automatically
        setSelectedModel(model)
        handleInitialGeneration(initialPrompt, model)
        
        // Clear URL parameters
        window.history.replaceState({}, '', `/p/${projectId}`)
      }
    }
  }, [project, projectId, isGenerating])

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

  const loadProjects = async (): Promise<void> => {
    setIsLoadingProjects(true)
    try {
      const token = await getAccessToken()
      if (!token) {
        return
      }

      const response = await fetch("http://localhost:3001/projects", {
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        console.error("Failed to load projects")
        return
      }

      const projectsData: Project[] = await response.json()
      setProjects(projectsData.map((p) => ({ ...p, status: "completed" })))
    } catch (err) {
      console.error("Error loading projects:", err)
    } finally {
      setIsLoadingProjects(false)
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

  const handleInitialGeneration = async (prompt: string, model: string): Promise<void> => {
    if (isGenerating || !project) return
    
    setIsGenerating(true)
    setStreamingResponse("")
    setError("")

    try {
      const token = await getAccessToken()
      if (!token) {
        throw new Error("Failed to get authentication token")
      }

      setStreamingResponse("🚀 Initializing AI generation...\n\n")

      const chatResponse = await fetch("http://localhost:3001/chat", {
        method: "POST",
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          projectId: project.id,
          model,
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
    } catch (err) {
      console.error("Error in initial generation:", err)
      setError(err instanceof Error ? err.message : "Failed to process initial request")
      setStreamingResponse("❌ Error occurred during initial generation. Please try again.")
    } finally {
      setIsGenerating(false)
    }
  }

  // Show loader while Privy is initializing
  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin" />
            <p className="text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Redirect to home if not authenticated
  if (!authenticated || !user) {
    router.push('/')
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin" />
            <p className="text-muted-foreground">Redirecting...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin" />
            <p className="text-muted-foreground">Loading project...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="mx-auto mb-4 h-8 w-8 text-destructive" />
            <p className="mb-4 text-destructive">{error}</p>
            <Link href="/">
              <Button>Go Back Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation user={user} onLogout={logout} />
      
      <ProjectsSidebar 
        projects={projects}
        isLoadingProjects={isLoadingProjects}
        onLoadProjects={loadProjects}
        topOffset={64}
      />
      
      {/* Project Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex w-full items-center justify-between px-12 py-6">
          <div className="flex items-center gap-6">
            {/* <Link href="/">
              <Button variant="ghost" size="sm" className="h-10 px-4">
                <ArrowLeft className="mr-2 h-5 w-5" />
                Back to Home
              </Button>
            </Link> */}
            <div>
              <h2 className="text-xl font-semibold text-foreground">Project</h2>
              <p className="text-muted-foreground leading-relaxed">{project?.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Created: {project ? new Date(project.createdAt).toLocaleDateString() : ""}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 bg-background">
        <div className="mx-auto h-full w-full px-12 py-8">
          <div className="grid h-full grid-cols-1 gap-8 md:grid-cols-[30%_70%]">
            {/* Left Column: Input */}
            <div className="flex min-h-0 flex-col">
              <Card className="h-full border border-border/50 shadow-lg bg-card/50 backdrop-blur-sm">
                <CardHeader className="pb-6">
                  <CardTitle className="text-2xl mb-2">Continue Working</CardTitle>
                  <p className="text-muted-foreground leading-relaxed">Ask questions, request changes, or add new features</p>
                </CardHeader>
                <Separator />
                <CardContent className="space-y-6 pt-6">
                  <div>
                    <Label htmlFor="prompt" className="mb-3 block text-base font-medium">
                      Your Message
                    </Label>
                    <Textarea
                      id="prompt"
                      placeholder="Ask a question, request changes, or add new features..."
                      value={newPrompt}
                      onChange={(e) => setNewPrompt(e.target.value)}
                      className="min-h-[160px] resize-none text-base leading-relaxed"
                      disabled={isGenerating}
                    />
                  </div>

                  <div>
                    <Label htmlFor="model" className="mb-3 block text-base font-medium">
                      AI Model
                    </Label>
                    <Select value={selectedModel} onValueChange={setSelectedModel} disabled={isGenerating}>
                      <SelectTrigger className="w-full h-12">
                        <SelectValue placeholder="Select a model" />
                      </SelectTrigger>
                      <SelectContent>
                        {AVAILABLE_MODELS.map((model) => (
                          <SelectItem key={model.value} value={model.value} className="py-3">
                            <span className="font-medium">{model.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    onClick={handleSubmit}
                    disabled={!newPrompt.trim() || isGenerating}
                    className="w-full h-14 text-lg font-medium bg-primary hover:bg-primary/90 border-0"
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
                        Send Message
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: AI Response + Conversation History */}
            <div className="flex min-h-0 flex-col gap-8">
              {/* AI Response */}
              <Card className="min-h-0 flex-1 border border-border/50 shadow-lg bg-card/50 backdrop-blur-sm">
                <CardHeader className="pb-6">
                  <CardTitle className="text-2xl mb-2">AI Response</CardTitle>
                  <p className="text-muted-foreground leading-relaxed">Real-time AI responses and updates</p>
                </CardHeader>
                <Separator />
                <CardContent className="min-h-0 h-full p-0">
                  <ScrollArea className="h-full p-6">
                    {streamingResponse ? (
                      <div className="rounded-2xl border border-border/30 bg-muted/20 p-6">
                        <pre className="whitespace-pre-wrap font-sans text-base leading-relaxed">{streamingResponse}</pre>
                      </div>
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <div className="text-center">
                          <div className="mb-6 text-6xl text-muted-foreground">💬</div>
                          <p className="text-muted-foreground leading-relaxed">AI response will appear here</p>
                        </div>
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Conversation History */}
              <Card className="min-h-0 flex-1 border border-border/50 shadow-lg bg-card/50 backdrop-blur-sm">
                <CardHeader className="pb-6">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-2xl mb-2">Conversation History</CardTitle>
                    <Badge variant="secondary" className="px-3 py-1">{project?.prompts.length || 0} messages</Badge>
                  </div>
                </CardHeader>
                <Separator />
                <CardContent className="min-h-0 h-full p-0">
                  <ScrollArea className="h-full p-6">
                    <div className="space-y-4">
                      {project?.prompts.map((prompt) => (
                        <Card
                          key={prompt.id}
                          className={`cursor-pointer rounded-xl transition-all hover:bg-muted/30 hover:shadow-md ${
                            prompt.type === "USER" ? "ml-8" : "mr-8"
                          }`}
                          title="Click to use this as context"
                          onClick={() =>
                            setNewPrompt((prev) => (prev ? `${prev}\n\n${prompt.content}` : prompt.content))
                          }
                        >
                          <CardContent className="p-5">
                            <div className="mb-3 flex items-center justify-between">
                              <Badge variant={prompt.type === "USER" ? "default" : "secondary"} className="text-sm px-3 py-1">
                                {prompt.type === "USER" ? "👤 You" : "🤖 AI"}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {new Date(prompt.createdAt).toLocaleTimeString()}
                              </span>
                            </div>
                            <pre className="whitespace-pre-wrap font-sans text-base leading-relaxed">
                              {prompt.content}
                            </pre>
                          </CardContent>
                        </Card>
                      ))}

                      {project?.prompts.length === 0 && (
                        <div className="py-12 text-center">
                          <p className="text-muted-foreground leading-relaxed">
                            No conversation yet. Start by sending a message!
                          </p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
