"use client"

import { usePrivy } from "@privy-io/react-auth"
import { Button } from "../components/ui/button"
import { Card } from "../components/ui/card"
import { Textarea } from "../components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select"
import { Label } from "../components/ui/label"
import { Navigation } from "../components/navigation"
import { ProjectsSidebar } from "../components/ProjectsSidebar"
import { LoginForm } from "../components/login-form"
import { type JSX, useEffect, useState, useCallback } from "react"
import { registerUser, API_BASE_URL } from "../lib/api"
import { useRouter } from "next/navigation"
import { Zap, Send, Loader2, AlertCircle } from "lucide-react"

type ProjectStatus = "creating" | "generating" | "completed" | "error"

interface Project {
  id: string
  description: string
  userId: string
  createdAt: string
  updatedAt: string
}

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

export default function Home(): JSX.Element {
  const { login, authenticated, user, logout, ready, getAccessToken } = usePrivy()
  const router = useRouter()
  const [isRegistering, setIsRegistering] = useState(false)
  const [registrationError, setRegistrationError] = useState<string | null>(null)
  
  // Form state
  const [prompt, setPrompt] = useState<string>("")
  const [selectedModel, setSelectedModel] = useState<string>("gpt-4o")
  const [isCreating, setIsCreating] = useState<boolean>(false)
  const [error, setError] = useState<string>("")

  // Projects state for sidebar
  const [projects, setProjects] = useState<ProjectWithStatus[]>([])
  const [isLoadingProjects, setIsLoadingProjects] = useState<boolean>(false)

  const handleRegistration = useCallback(async () => {
    if (!user?.id) return
    setIsRegistering(true)
    setRegistrationError(null)
    try {
      const userData = {
        privyUserId: user.id,
        email: user.email?.address || "",
        walletAddress: user.wallet?.address || undefined,
      }
      if (!userData.email && userData.walletAddress) {
        userData.email = `wallet-user-${userData.walletAddress.substring(0, 8)}@example.com`
      }
      await registerUser(userData)
    } catch (error) {
      setRegistrationError(error instanceof Error ? error.message : "Registration failed")
    } finally {
      setIsRegistering(false)
    }
  }, [user])

  const loadProjects = useCallback(async (): Promise<void> => {
    if (!authenticated) return
    
    setIsLoadingProjects(true)
    try {
      const token = await getAccessToken()
      if (!token) {
        console.warn("No access token available")
        return
      }

      const response = await fetch(`${API_BASE_URL}/api/projects`, {
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || errorData.message || response.statusText
        console.error(`Failed to load projects: ${errorMessage}`)
        return
      }

      const projectsData: Project[] = await response.json()
      setProjects(projectsData.map((p) => ({ ...p, status: "completed" })))
    } catch (err) {
      console.error("Error loading projects:", err)
    } finally {
      setIsLoadingProjects(false)
    }
  }, [authenticated, getAccessToken])

  useEffect(() => {
    if (ready && authenticated && user?.id) {
      handleRegistration()
    }
  }, [ready, authenticated, user, handleRegistration])

  useEffect(() => {
    if (authenticated && !isRegistering) {
      loadProjects()
    }
  }, [authenticated, isRegistering, loadProjects])

  const handleCreateProject = async (): Promise<void> => {
    if (!prompt.trim() || isCreating) return

    setIsCreating(true)
    setError("")

    try {
      const token = await getAccessToken()
      if (!token) {
        throw new Error("Authentication required")
      }

      const projectResponse = await fetch(`${API_BASE_URL}/api/project`, {
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

      // Navigate to project page with initial prompt and model for immediate AI generation
      router.push(`/p/${projectId}?initialPrompt=${encodeURIComponent(prompt)}&model=${selectedModel}`)
    } catch (err) {
      console.error("Error creating project:", err)
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setIsCreating(false)
    }
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="w-full max-w-lg mx-auto text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-primary/5 border border-primary/10 mb-8">
            <Zap className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-3">Loading Sol-Dapper</h1>
          <p className="text-muted-foreground mb-12 text-lg leading-relaxed">
            Initializing your workspace...
          </p>
          
          <Card className="p-10 border border-border/50 shadow-lg bg-card/50 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-6">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
              </div>
              <div className="space-y-3 text-center">
                <p className="font-medium text-foreground text-lg">Loading...</p>
                <p className="text-muted-foreground">Please wait</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  if (!authenticated || !user) {
    return (
      <main
        role="main"
        aria-label="Sol-Dapper authentication"
        className="min-h-screen bg-background flex items-center justify-center p-6"
      >
        <div className="w-full max-w-md mx-auto">
          <LoginForm onLogin={login} />
        </div>
      </main>
    );
  }

  if (isRegistering) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="w-full max-w-lg mx-auto text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-primary/5 border border-primary/10 mb-8">
            <Zap className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-3">Setting Up Your Account</h1>
          <p className="text-muted-foreground mb-12 text-lg leading-relaxed">
            We&apos;re preparing your personalized workspace...
          </p>
          
          <Card className="p-10 border border-border/50 shadow-lg bg-card/50 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-6">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
              </div>
              <div className="space-y-3 text-center">
                <p className="font-medium text-foreground text-lg">Initializing workspace...</p>
                <p className="text-muted-foreground">This will only take a moment</p>
              </div>
              {registrationError && (
                <div className="w-full p-4 rounded-xl bg-destructive/10 border border-destructive/20">
                  <p className="font-medium text-destructive mb-1">Setup Error</p>
                  <p className="text-sm text-destructive/80">{registrationError}</p>
                </div>
              )}
            </div>
          </Card>
        </div>
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
      
      <main className="flex-1 flex items-center justify-center p-12">
        <div className="w-full max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-primary/10 border border-primary/20 mb-6">
              <Zap className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-4">Create Your Solana App</h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Describe your application idea and let AI generate a complete Solana project for you
            </p>
          </div>

          <Card className="p-8 border border-border/50 shadow-lg bg-card/50 backdrop-blur-sm">
            <div className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="prompt" className="text-base font-medium">
                  Project Description
                </Label>
                <Textarea
                  id="prompt"
                  placeholder="Describe the Solana application you want to create. Be specific about features, functionality, and any technical requirements..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-[160px] resize-none border-border/50 focus:border-primary/50 text-base leading-relaxed"
                  disabled={isCreating}
                />
                <p className="text-sm text-muted-foreground">
                  {prompt.length}/2000 characters
                </p>
              </div>

              <div className="space-y-3">
                <Label htmlFor="model" className="text-base font-medium">
                  AI Model
                </Label>
                <Select value={selectedModel} onValueChange={setSelectedModel} disabled={isCreating}>
                  <SelectTrigger className="w-full border-border/50 h-12">
                    <SelectValue>
                      <span className="font-medium">{AVAILABLE_MODELS.find((m) => m.value === selectedModel)?.label}</span>
                    </SelectValue>
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

              {error && (
                <div className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4">
                  <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <p className="font-medium text-destructive">Error</p>
                    <p className="text-sm text-destructive/80 leading-relaxed">{error}</p>
                  </div>
                </div>
              )}

              <Button 
                onClick={handleCreateProject} 
                disabled={!prompt.trim() || isCreating || prompt.length > 2000} 
                className="w-full h-14 text-lg font-medium"
                size="lg"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                    Creating Project...
                  </>
                ) : (
                  <>
                    <Send className="mr-3 h-6 w-6" />
                    Create & Generate
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>
      </main>
    </div>
  )
}
