"use client"

import { usePrivy } from "@privy-io/react-auth"
import { Card } from "../components/ui/card"
import { Navigation } from "../components/navigation"
import { ProjectsSidebar } from "../components/ProjectsSidebar"
import { LoginForm } from "../components/login-form"
import { PromptInputBox } from "../components/ui/ai-prompt-box"
import { ShaderAnimation } from "../components/ui/shader-animation"
import { PageLoader, InlineLoader, LoadingSpinner } from "../components/ui/loading-spinner"
import { type JSX, useEffect, useState, useCallback } from "react"
import { registerUser, API_BASE_URL } from "../lib/api"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { AlertCircle } from "lucide-react"
import Image from "next/image"

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
  { value: "claude-3-7-sonnet-20250219", label: "Claude 3.7 Sonnet"},
  { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
] as const

export default function Home(): JSX.Element {
  const { login, authenticated, user, logout, ready, getAccessToken } = usePrivy()
  const { setTheme } = useTheme()
  const router = useRouter()
  const [isRegistering, setIsRegistering] = useState(false)
  const [registrationError, setRegistrationError] = useState<string | null>(null)
  
  // Form state
  const [prompt, setPrompt] = useState<string>("")
  const [selectedModel, setSelectedModel] = useState<string>("claude-3-7-sonnet-20250219")
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

  // Force dark mode on the home page and login page
  useEffect(() => {
    setTheme("dark")
  }, [setTheme])

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
    return <PageLoader text="Initializing your workspace..." />
  }

  if (!authenticated || !user) {
    return (
      <div className="min-h-screen relative flex flex-col">
        {/* Shader Animation Background */}
        <div className="fixed inset-0 z-0">
          <ShaderAnimation />
        </div>
        
        {/* Main Content */}
        <main
          role="main"
          aria-label="Sol-Dapper authentication"
          className="relative z-10 min-h-screen flex items-center justify-center p-6"
        >
          <div className="w-full max-w-md mx-auto">
            <LoginForm onLogin={login} />
          </div>
        </main>
      </div>
    );
  }

  if (isRegistering) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="w-full max-w-lg mx-auto text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 mb-8">
            <Image 
              src="/dapperGithub.jpg" 
              alt="Sol-Dapper Logo" 
              width={80} 
              height={80} 
              className="object-cover" 
            />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-3">Setting Up Your Account</h1>
          <p className="text-muted-foreground mb-12 text-lg leading-relaxed">
            We&apos;re preparing your personalized workspace...
          </p>
          
                      <Card className="p-10 border border-border/50 shadow-lg bg-card/50 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-6">
              <LoadingSpinner 
                variant="branded" 
                size="xl" 
                text="Initializing workspace..." 
                className="w-full"
              />
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
    <div className="min-h-screen relative flex flex-col">
      {/* Shader Animation Background */}
      <div className="fixed inset-0 z-0">
        <ShaderAnimation />
      </div>
      
      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        <Navigation user={user} onLogout={logout} />
        
        <ProjectsSidebar 
          projects={projects}
          isLoadingProjects={isLoadingProjects}
          onLoadProjects={loadProjects}
          topOffset={64}
        />
        
        <main className="flex-1 flex flex-col items-center justify-center p-12">
          <div className="w-full max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-16 h-16 mb-6">
                <Image 
                  src="/dapperGithub.jpg" 
                  alt="Sol-Dapper Logo" 
                  width={64} 
                  height={64} 
                  className="object-cover" 
                />
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-4 drop-shadow-sm">Create Your Solana App</h1>
              <p className="text-lg text-muted-foreground leading-relaxed drop-shadow-sm">
                Describe your application idea and let AI generate a complete Solana project for you
              </p>
            </div>

            <div className="space-y-6">
              {/* Error Display */}
              {error && (
                <div className="flex justify-center">
                  <div className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/10 backdrop-blur-sm p-4 max-w-2xl">
                    <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                    <div className="space-y-1">
                      <p className="font-medium text-destructive">Error</p>
                      <p className="text-sm text-destructive/80 leading-relaxed">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* AI Prompt Box */}
              <div className="w-full max-w-2xl mx-auto">
                <PromptInputBox
                  value={prompt}
                  onValueChange={setPrompt}
                  onSend={(message) => {
                    if (message.trim() && message.length <= 2000) {
                      handleCreateProject();
                    }
                  }}
                  isLoading={isCreating}
                  placeholder="Describe the Solana application you want to create. Be specific about features, functionality, and any technical requirements..."
                  className="w-full backdrop-blur-sm"
                  aiModels={AVAILABLE_MODELS}
                  selectedModel={selectedModel}
                  onModelChange={setSelectedModel}
                />
                
                {/* Character count */}
                <div className="flex justify-between items-center mt-2 px-4">
                  {/* <p className="text-sm text-muted-foreground drop-shadow-sm">
                    {prompt.length}/2000 characters
                  </p> */}
                                  {isCreating && (
                  <InlineLoader 
                    size="sm" 
                    text="Creating Project..." 
                    className="text-sm text-muted-foreground drop-shadow-sm"
                  />
                )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
