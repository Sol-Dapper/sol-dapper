"use client"

import { useParams, useSearchParams, useRouter } from "next/navigation"
import { usePrivy } from "@privy-io/react-auth"
import { useState, useEffect, useCallback, useRef, type JSX } from "react"
import { Button } from "../../../components/ui/button"
import { Textarea } from "../../../components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card"
import { Separator } from "../../../components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select"
import { Navigation } from "../../../components/navigation"
import { ProjectsSidebar } from "../../../components/ProjectsSidebar"
import { AIResponseRenderer } from "../../../components/AIResponseRenderer"
import { Send, Loader2, AlertCircle, Calendar, Play, Square, Terminal, ExternalLink, RefreshCw } from "lucide-react"
import Link from "next/link"
import { Label } from "../../../components/ui/label"
import { API_BASE_URL } from "../../../lib/api"
import { WebContainer, type WebContainerProcess } from "@webcontainer/api"
import { WebContainerSingleton } from "../../../lib/webcontainer-singleton"
import { AIResponseParser, type ParsedFile } from "../../../lib/xml-parser"
import { Badge } from "../../../components/ui/badge"
import { ScrollArea } from "../../../components/ui/scroll-area"

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

interface ExecutionStep {
  id: string
  name: string
  status: 'idle' | 'running' | 'success' | 'error'
  output?: string
  timestamp: number
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
  const [projectFiles, setProjectFiles] = useState<string>("")
  const [existingFiles, setExistingFiles] = useState<string>("") // Store existing files separately

  // Projects state for sidebar
  const [projects, setProjects] = useState<ProjectWithStatus[]>([])
  const [isLoadingProjects, setIsLoadingProjects] = useState<boolean>(false)
  const [isFirstResponse, setIsFirstResponse] = useState<boolean>(true) // Track if this is the first response

  // WebContainer specific state
  const [webcontainer, setWebcontainer] = useState<WebContainer | null>(null)
  const [isBootingContainer, setIsBootingContainer] = useState(false)
  const [containerReady, setContainerReady] = useState(false)
  const [currentProcess, setCurrentProcess] = useState<WebContainerProcess | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [isRunning, setIsRunning] = useState(false)
  const [terminalOutput, setTerminalOutput] = useState<string>('')
  const [steps, setSteps] = useState<ExecutionStep[]>([])
  const [view, setView] = useState<'code' | 'preview'>('code')
  const [parsedFiles, setParsedFiles] = useState<ParsedFile[]>([])
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const terminalRef = useRef<HTMLPreElement>(null)
  
  const parser = new AIResponseParser()

  // Function to clean ANSI codes from terminal output
  const cleanAnsiCodes = (text: string) => {
    // Remove ANSI escape sequences and cursor control codes
    return text.replace(/\x1B\[[0-9;]*[JKmsu]/g, '')
              .replace(/\x1B\[[0-9]*[ABCD]/g, '')
              .replace(/\x1B\[2K/g, '')
              .replace(/\x1B\[1G/g, '')
              .replace(/\x1B\[0K/g, '')
              .replace(/\x1B\[.*?m/g, '') // Remove all color codes
              .replace(/\r/g, '') // Remove carriage returns
  }

  useEffect(() => {
    if (authenticated && !webcontainer && !isBootingContainer) {
      bootWebContainer()
    }
  }, [authenticated]) // Remove webcontainer and isBootingContainer from deps to prevent re-runs

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Stop any running processes when component unmounts
      if (currentProcess) {
        currentProcess.kill()
      }
    }
  }, [currentProcess])

  useEffect(() => {
    if (authenticated && projectId) {
      loadProject()
      loadProjects()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project, projectId, isGenerating])

  // Extract and combine all files from project AI responses
  useEffect(() => {
    if (project && project.prompts) {
      const systemPrompts = project.prompts.filter(prompt => prompt.type === 'SYSTEM')
      
      // If we have multiple system prompts, the "existing files" should be all but the last one
      // This way the last response is treated as "new" and can be properly merged with boilerplate
      const existingPrompts = systemPrompts.length > 1 ? systemPrompts.slice(0, -1) : []
      const currentPrompts = systemPrompts.length > 0 ? [systemPrompts[systemPrompts.length - 1]] : []
      
      const allFiles = systemPrompts
        .map(prompt => prompt.content)
        .join('\n\n')
      
      const existingFilesContent = existingPrompts
        .map(prompt => prompt.content)
        .join('\n\n')
      
      const currentFilesContent = currentPrompts
        .map(prompt => prompt?.content || '')
        .join('\n\n')
      
      setProjectFiles(isGenerating ? allFiles : currentFilesContent)
      setExistingFiles(existingFilesContent)
      
      // Determine if this is the first response based on existing system prompts
      setIsFirstResponse(systemPrompts.length === 0)
      
      console.log('Project files updated:', {
        totalSystemPrompts: systemPrompts.length,
        existingPrompts: existingPrompts.length,
        currentPrompts: currentPrompts.length,
        isGenerating,
        isFirstResponse: systemPrompts.length === 0,
        hasExistingFiles: existingFilesContent.length > 0
      })

      // This effect will be replaced by the onParsedFiles callback from AIResponseRenderer
    }
  }, [project, webcontainer, containerReady])

  // Mount files to WebContainer when parsedFiles change
  useEffect(() => {
    if (webcontainer && containerReady && parsedFiles.length > 0) {
      mountParsedFiles(parsedFiles)
    }
  }, [parsedFiles, webcontainer, containerReady])

  // Auto-scroll terminal output to bottom
  useEffect(() => {
    if (terminalRef.current && terminalOutput) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [terminalOutput])

  const bootWebContainer = async () => {
    if (isBootingContainer) return
    
    try {
      setIsBootingContainer(true)
      addStep({
        id: 'boot',
        name: 'Booting WebContainer',
        status: 'running'
      })

      // Use singleton to ensure only one WebContainer instance
      const container = await WebContainerSingleton.getInstance()
      setWebcontainer(container)
      setContainerReady(true)
      
      updateStep('boot', { status: 'success' })

      // Listen for server-ready events
      container.on('server-ready', (port, url) => {
        console.log(`Server ready on port ${port}: ${url}`)
        setPreviewUrl(url)
        setTerminalOutput(prev => prev + `\n🚀 Dev server ready at: ${url}\n`)
      })

      console.log('WebContainer booted successfully')
    } catch (err) {
      console.error('Failed to boot WebContainer:', err)
      updateStep('boot', { 
        status: 'error', 
        output: err instanceof Error ? err.message : 'Unknown error'
      })
    } finally {
      setIsBootingContainer(false)
    }
  }

  const mountParsedFiles = async (files: ParsedFile[]) => {
    if (!webcontainer || !containerReady) return

    try {
      addStep({
        id: 'mount',
        name: 'Mounting project files',
        status: 'running'
      })

      if (files.length === 0) {
        console.log('No files to mount')
        updateStep('mount', { status: 'success', output: 'No files to mount' })
        return
      }

      console.log(`Mounting ${files.length} files to WebContainer`)
      console.log('Files to mount:', files.map(f => f.path))
      
      // Check if package.json is in the files
      const hasPackageJson = files.some(f => f.path === 'package.json' || f.path === '/package.json' || f.path.endsWith('/package.json'))
      console.log('Has package.json:', hasPackageJson)
      
      // Create a copy of files array so we can modify it
      const filesToMount = [...files]
      
      // If no package.json is found, create a basic one
      if (!hasPackageJson) {
        console.log('No package.json found in parsed files, creating a basic one')
        const basicPackageJson = {
          id: 'package-json-fallback',
          name: 'package.json',
          path: 'package.json',
          content: JSON.stringify({
            "name": "ai-generated-project",
            "version": "1.0.0",
            "type": "module",
            "scripts": {
              "dev": "next dev",
              "build": "next build",
              "start": "next start",
              "lint": "next lint"
            },
            "dependencies": {
              "next": "^15.0.0",
              "react": "^18.0.0",
              "react-dom": "^18.0.0"
            },
            "devDependencies": {
              "@types/node": "^20.0.0",
              "@types/react": "^18.0.0",
              "@types/react-dom": "^18.0.0",
              "typescript": "^5.0.0"
            }
          }, null, 2),
          language: 'json'
        }
        filesToMount.push(basicPackageJson)
        console.log('Added basic package.json to files')
      }

      // Convert parsed files to WebContainer file system format
      const fileSystemTree: Record<string, any> = {}

      // Create directory structure first
      const directories = new Set<string>()
      filesToMount.forEach(file => {
        const normalizedPath = file.path.replace(/^\/+/, '')
        const pathParts = normalizedPath.split('/').filter(Boolean)
        for (let i = 0; i < pathParts.length - 1; i++) {
          const dirPath = pathParts.slice(0, i + 1).join('/')
          directories.add(dirPath)
        }
      })

      console.log('Directories to create:', Array.from(directories))

      // Add directories to file system tree
      directories.forEach(dirPath => {
        const pathParts = dirPath.split('/')
        let current = fileSystemTree
        pathParts.forEach((part) => {
          if (!current[part]) {
            current[part] = { directory: {} }
          }
          current = current[part].directory
        })
      })

      // Add files to file system tree
      filesToMount.forEach(file => {
        // Normalize path - remove leading slashes and handle different path formats
        let normalizedPath = file.path.replace(/^\/+/, '')
        if (!normalizedPath) {
          console.warn('Skipping file with empty path:', file.name)
          return
        }
        
        const pathParts = normalizedPath.split('/').filter(Boolean)
        const fileName = pathParts.pop()!
        
        console.log(`Mounting file: ${file.path} -> ${normalizedPath}`)
        
        let current = fileSystemTree
        pathParts.forEach(part => {
          if (!current[part]) {
            current[part] = { directory: {} }
          }
          current = current[part].directory
        })

        current[fileName] = {
          file: {
            contents: file.content
          }
        }
      })

      // Mount the file system
      await webcontainer.mount(fileSystemTree)
      updateStep('mount', { status: 'success' })
      
      console.log('Files mounted successfully')
      console.log('File system tree:', Object.keys(fileSystemTree))
    } catch (err) {
      console.error('Failed to mount files:', err)
      updateStep('mount', { 
        status: 'error', 
        output: err instanceof Error ? err.message : 'Unknown error'
      })
    }
  }

  const installDependencies = async () => {
    if (!webcontainer || !containerReady) return

    try {
      // Check if package.json exists first
      try {
        await webcontainer.fs.readFile('/package.json', 'utf-8')
      } catch {
        throw new Error('No package.json found. Please ensure your project includes a package.json file.')
      }

      // Check if node_modules already exists
      try {
        await webcontainer.fs.readdir('/node_modules')
        console.log('Dependencies already installed, skipping...')
        addStep({
          id: 'install',
          name: 'Dependencies already installed',
          status: 'success'
        })
        return
      } catch {
        // node_modules doesn't exist, proceed with install
      }

      addStep({
        id: 'install',
        name: 'Installing dependencies',
        status: 'running'
      })

            setTerminalOutput(prev => prev + '\n--- Installing dependencies ---\n')
      
      // Try npm install with registry and network optimizations
      const installProcess = await webcontainer.spawn('npm', [
        'install', 
        '--no-package-lock', 
        '--no-audit', 
        '--no-fund',
        '--registry=https://registry.npmjs.org/',
        '--fetch-retries=3',
        '--fetch-retry-mintimeout=20000',
        '--fetch-retry-maxtimeout=120000',
        '--maxsockets=1'
      ])
      
      let output = ''
      let outputReceived = false
      
      // Set up output streaming
      installProcess.output.pipeTo(new WritableStream({
        write(data) {
          output += data
          outputReceived = true
          const cleanData = cleanAnsiCodes(data)
          setTerminalOutput(prev => prev + cleanData)
          console.log('npm install output:', cleanData)
          
          // Check for completion indicators
          if (data.includes('packages installed') || data.includes('added') || data.includes('up to date')) {
            console.log('Installation appears to be completing...')
          }
        }
      })).catch(err => {
        console.error('Output stream error:', err)
      })

      // Set up progressive timeout warnings
      const timeouts: NodeJS.Timeout[] = []
      
      timeouts.push(setTimeout(() => {
        setTerminalOutput(prev => prev + '\n[INFO] Installation in progress... (60s)\n')
      }, 60000))
      
      timeouts.push(setTimeout(() => {
        setTerminalOutput(prev => prev + '\n[INFO] Still installing dependencies... Network may be slow (120s)\n')
      }, 120000))
      
      timeouts.push(setTimeout(() => {
        setTerminalOutput(prev => prev + '\n[INFO] Large project installation continues... (180s)\n')
      }, 180000))

      try {
        console.log('Starting npm install process...')
        const exitCode = await installProcess.exit
        timeouts.forEach(clearTimeout)
        
        console.log('npm install completed with exit code:', exitCode)
        
        if (exitCode !== 0) {
          throw new Error(`npm install failed with exit code ${exitCode}`)
        }
        
        // Verify installation worked
        try {
          await webcontainer.fs.readdir('/node_modules')
          console.log('node_modules directory created successfully')
        } catch {
          console.warn('node_modules not found after install, but continuing...')
        }
        
      } catch (error) {
        timeouts.forEach(clearTimeout)
        throw error
      }

        updateStep('install', { status: 'success', output })
      console.log('Dependencies installed successfully')
    } catch (err) {
      console.error('Failed to install dependencies:', err)
      updateStep('install', { 
        status: 'error', 
        output: err instanceof Error ? err.message : 'Unknown error'
      })
      throw err // Re-throw to stop the dev server start
    }
  }

  const startDevServer = async () => {
    if (!webcontainer || !containerReady || isRunning) return

    try {
      setIsRunning(true)
      setTerminalOutput(prev => prev + '\n--- Starting Development Server ---\n')
      
      // Check if dependencies are already installed
      const installStep = steps.find(step => step.id === 'install')
      const dependenciesInstalled = installStep?.status === 'success'
      
      if (!dependenciesInstalled) {
        // First install dependencies
        await installDependencies()
      } else {
        setTerminalOutput(prev => prev + '\n📦 Dependencies already installed, starting dev server...\n')
      }

      setTerminalOutput(prev => prev + '\n--- Launching dev server ---\n')

      // Start the dev server
      const devProcess = await webcontainer.spawn('npm', ['run', 'dev'])
      setCurrentProcess(devProcess)
      
      let serverStarted = false
      
      // Set up output streaming and detect server ready
      devProcess.output.pipeTo(new WritableStream({
        write(data) {
          setTerminalOutput(prev => prev + data)
          console.log('Dev server output:', data)
          
          // More comprehensive server ready detection
          const readyIndicators = [
            'Local:',
            'localhost:',
            'ready -',
            'ready on',
            'started server on',
            'server started on',
            'running at',
            'listening on',
            'available on',
            'http://localhost',
            '➜  Local:'
          ]
          
          const isReady = readyIndicators.some(indicator => 
            data.toLowerCase().includes(indicator.toLowerCase())
          )
          
          if (isReady && !serverStarted) {
            serverStarted = true
            setTerminalOutput(prev => prev + '\n🚀 Development server is ready!\n')
            console.log('Development server detected as ready')
          }
        }
      })).catch(console.error)

      // Monitor the process
      devProcess.exit.then(exitCode => {
        console.log('Dev server process exited with code:', exitCode)
        setIsRunning(false)
        setCurrentProcess(null)
        if (exitCode !== 0) {
          setTerminalOutput(prev => prev + `\n❌ Dev server exited with code ${exitCode}\n`)
        }
      }).catch(err => {
        console.error('Dev server process error:', err)
        setIsRunning(false)
        setCurrentProcess(null)
        setTerminalOutput(prev => prev + `\n❌ Dev server error: ${err}\n`)
      })

      console.log('Development server process started')
      setTerminalOutput(prev => prev + 'Development server starting...\n')
      
    } catch (err) {
      console.error('Failed to start dev server:', err)
      setTerminalOutput(prev => prev + `\n❌ Failed to start dev server: ${err}\n`)
      setIsRunning(false)
    }
  }

  const stopDevServer = async () => {
    if (currentProcess) {
      currentProcess.kill()
      setCurrentProcess(null)
      setIsRunning(false)
      setPreviewUrl('')
      setTerminalOutput(prev => prev + '\n🛑 Development server stopped\n')
      addStep({
        id: 'stop',
        name: 'Stopped development server',
        status: 'success'
      })
    }
  }

  const addStep = (step: Omit<ExecutionStep, 'timestamp'>) => {
    setSteps(prev => {
      const existingStepIndex = prev.findIndex(s => s.id === step.id)
      if (existingStepIndex >= 0) {
        // Update existing step instead of adding duplicate
        return prev.map((s, index) => 
          index === existingStepIndex 
            ? { ...step, timestamp: Date.now() }
            : s
        )
      }
      // Add new step
      return [...prev, { ...step, timestamp: Date.now() }]
    })
  }

  const updateStep = (id: string, updates: Partial<ExecutionStep>) => {
    setSteps(prev => 
      prev.map(step => 
        step.id === id 
          ? { ...step, ...updates, timestamp: Date.now() }
          : step
      )
    )
  }

  const loadProject = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      setError("")
      const token = await getAccessToken()
      if (!token) {
        setError("Failed to get authentication token")
        return
      }
      const response = await fetch(`${API_BASE_URL}/api/project/${projectId}`, {
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
  }, [projectId, getAccessToken])

  const loadProjects = useCallback(async (): Promise<void> => {
    setIsLoadingProjects(true)
    try {
      const token = await getAccessToken()
      if (!token) {
        return
      }

      const response = await fetch(`${API_BASE_URL}/api/projects`, {
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
  }, [getAccessToken])

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

      const chatResponse = await fetch(`${API_BASE_URL}/api/chat`, {
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
      setStreamingResponse("") // Clear streaming response after project reload
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

      const chatResponse = await fetch(`${API_BASE_URL}/api/chat`, {
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
      setStreamingResponse("") // Clear streaming response after project reload
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
            <div>
              <h2 className="text-xl font-semibold text-foreground">Project</h2>
              <p className="text-muted-foreground leading-relaxed">{project?.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Created: {project ? new Date(project.createdAt).toLocaleDateString() : ""}</span>
            </div>
            {containerReady && (
              <Badge variant={containerReady ? "secondary" : "outline"}>
                WebContainer {containerReady ? "Ready" : "Loading"}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 bg-background">
        <div className="mx-auto h-full w-full px-12 py-8">
          <div className="grid h-full grid-cols-1 gap-6 xl:grid-cols-[30%_70%]">
            {/* Left Column: Input & Controls */}
            <div className="flex min-h-0 flex-col space-y-6">
              {/* Input Card */}
              <Card className="border border-border/50 shadow-lg bg-card/50 backdrop-blur-sm">
                <CardHeader className="pb-6">
                  <CardTitle className="text-xl mb-2">Continue Working</CardTitle>
                  <p className="text-sm text-muted-foreground leading-relaxed">Ask questions, request changes, or add new features</p>
                </CardHeader>
                <Separator />
                <CardContent className="space-y-6 pt-6">
                  <div>
                    <Label htmlFor="prompt" className="mb-3 block text-sm font-medium">
                      Your Message
                    </Label>
                    <Textarea
                      id="prompt"
                      placeholder="Ask a question, request changes, or add new features..."
                      value={newPrompt}
                      onChange={(e) => setNewPrompt(e.target.value)}
                      className="min-h-[120px] resize-none text-sm leading-relaxed"
                      disabled={isGenerating}
                    />
                  </div>

                  <div>
                    <Label htmlFor="model" className="mb-3 block text-sm font-medium">
                      AI Model
                    </Label>
                    <Select value={selectedModel} onValueChange={setSelectedModel} disabled={isGenerating}>
                      <SelectTrigger className="w-full h-10">
                        <SelectValue placeholder="Select a model" />
                      </SelectTrigger>
                      <SelectContent>
                        {AVAILABLE_MODELS.map((model) => (
                          <SelectItem key={model.value} value={model.value} className="py-2">
                            <span className="text-sm font-medium">{model.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    onClick={handleSubmit}
                    disabled={!newPrompt.trim() || isGenerating}
                    className="w-full h-12 text-base font-medium bg-primary hover:bg-primary/90 border-0"
                    size="lg"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-5 w-5" />
                        Send Message
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* WebContainer Controls */}
              <Card className="border border-border/50 shadow-lg bg-card/50 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg mb-1">Project Runtime</CardTitle>
                  <p className="text-sm text-muted-foreground">Run your project in the browser</p>
                </CardHeader>
                <Separator />
                <CardContent className="pt-4 space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={startDevServer}
                      disabled={!containerReady || isRunning}
                      variant="default"
                      size="sm"
                    >
                      {isRunning ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Starting...
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-4 w-4" />
                          Start Dev Server
                        </>
                      )}
                    </Button>

                    <Button
                      onClick={async () => {
                        if (!webcontainer || !containerReady) return
                        
                        try {
                          // Kill any running processes first
                          if (currentProcess) {
                            currentProcess.kill()
                            setCurrentProcess(null)
                            setTerminalOutput(prev => prev + '\n🛑 Stopped previous installation process\n')
                          }
                          
                          setTerminalOutput(prev => prev + '\n--- Installing with pnpm (faster alternative) ---\n')
                          const pnpmInstall = await webcontainer.spawn('pnpm', [
                            'install', 
                            '--no-frozen-lockfile',
                            '--registry=https://registry.npmjs.org/',
                            '--fetch-timeout=300000',
                            '--fetch-retries=3'
                          ])
                          
                          pnpmInstall.output.pipeTo(new WritableStream({
                            write(data) {
                              const cleanData = cleanAnsiCodes(data)
                              setTerminalOutput(prev => prev + cleanData)
                            }
                          })).catch(console.error)
                          
                          const exitCode = await pnpmInstall.exit
                          if (exitCode === 0) {
                            setTerminalOutput(prev => prev + '\n✅ pnpm install completed successfully!\n')
                            // Mark installation as complete so dev server can start
                            addStep({
                              id: 'install',
                              name: 'Dependencies installed (pnpm)',
                              status: 'success'
                            })
                          } else {
                            setTerminalOutput(prev => prev + `\n❌ pnpm install failed with exit code ${exitCode}\n`)
                            addStep({
                              id: 'install',
                              name: 'pnpm install failed',
                              status: 'error'
                            })
                          }
                        } catch (err) {
                          setTerminalOutput(prev => prev + `\n❌ pnpm install error: ${err}\n`)
                        }
                      }}
                      variant="outline"
                      size="sm"
                    >
                      Try pnpm (Faster)
                    </Button>
                    
                    <Button
                      onClick={stopDevServer}
                      disabled={!isRunning}
                      variant="destructive"
                      size="sm"
                    >
                      <Square className="mr-2 h-4 w-4" />
                      Stop
                    </Button>

                    <Button
                      onClick={async () => {
                        if (!webcontainer || !containerReady) return
                        
                        try {
                          // Kill any running processes first
                          if (currentProcess) {
                            currentProcess.kill()
                            setCurrentProcess(null)
                            setTerminalOutput(prev => prev + '\n🛑 Stopped previous installation process\n')
                          }
                          
                          setTerminalOutput(prev => prev + '\n--- Installing minimal dependencies ---\n')
                          // Try installing with minimal flags and offline cache
                          const minimalInstall = await webcontainer.spawn('npm', [
                            'install', 
                            '--prefer-offline',
                            '--no-audit',
                            '--no-fund',
                            '--production',
                            '--silent'
                          ])
                          
                          minimalInstall.output.pipeTo(new WritableStream({
                            write(data) {
                              const cleanData = cleanAnsiCodes(data)
                              setTerminalOutput(prev => prev + cleanData)
                            }
                          })).catch(console.error)
                          
                          const exitCode = await minimalInstall.exit
                          if (exitCode === 0) {
                            setTerminalOutput(prev => prev + '\n✅ Minimal install completed!\n')
                            addStep({
                              id: 'install',
                              name: 'Minimal dependencies installed',
                              status: 'success'
                            })
                          } else {
                            addStep({
                              id: 'install',
                              name: 'Minimal install failed',
                              status: 'error'
                            })
                          }
                        } catch (err) {
                          setTerminalOutput(prev => prev + `\n❌ Minimal install error: ${err}\n`)
                        }
                      }}
                      variant="secondary"
                      size="sm"
                    >
                      Minimal Install
                    </Button>

                    <Button
                      onClick={() => {
                        // Force reset all states
                        setIsRunning(false)
                        setCurrentProcess(null)
                        setSteps([])
                        setTerminalOutput(prev => prev + '\n--- Force reset all processes ---\n')
                        console.log('Force reset triggered')
                      }}
                      variant="outline"
                      size="sm"
                    >
                      Force Reset
                    </Button>



                    <Button
                      onClick={async () => {
                        if (webcontainer) {
                          try {
                            const files = await webcontainer.fs.readdir('/', { withFileTypes: true })
                            console.log('Root files:', files)
                            setTerminalOutput(prev => prev + `\n--- WebContainer Root Directory ---\n${files.map(f => `${f.isDirectory() ? 'DIR' : 'FILE'}: ${f.name}`).join('\n')}\n`)
                            
                            // Check specifically for package.json
                            try {
                              const packageJson = await webcontainer.fs.readFile('/package.json', 'utf-8')
                              setTerminalOutput(prev => prev + '\n--- package.json found ---\n')
                              console.log('package.json content:', packageJson.substring(0, 200) + '...')
                            } catch (err) {
                              setTerminalOutput(prev => prev + '\n--- package.json NOT found ---\n')
                              console.log('package.json error:', err)
                            }
                          } catch (err) {
                            console.error('Failed to read directory:', err)
                            setTerminalOutput(prev => prev + `\nError reading directory: ${err}\n`)
                          }
                        }
                      }}
                      variant="ghost"
                      size="sm"
                    >
                      Debug Files
                    </Button>

                    <Button
                      onClick={() => {
                        console.log('Current project data:', project)
                        console.log('Project files content:', projectFiles.substring(0, 1000))
                        console.log('Parsed files for mounting:', parsedFiles)
                        setTerminalOutput(prev => prev + `\n--- Current Project Info ---\n`)
                        setTerminalOutput(prev => prev + `Project ID: ${project?.id}\n`)
                        setTerminalOutput(prev => prev + `Project files length: ${projectFiles.length}\n`)
                        setTerminalOutput(prev => prev + `Parsed files count: ${parsedFiles.length}\n`)
                        setTerminalOutput(prev => prev + `Parsed files: ${parsedFiles.map(f => f.path).join(', ')}\n`)
                        setTerminalOutput(prev => prev + `Has existing files: ${!!existingFiles}\n`)
                        setTerminalOutput(prev => prev + `Files content preview: ${projectFiles.substring(0, 500)}...\n`)
                      }}
                      variant="ghost"
                      size="sm"
                    >
                      Debug Project
                    </Button>
                  </div>

                  {/* Terminal actions */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Terminal className="h-4 w-4" />
                      <h4 className="text-sm font-medium">Terminal Actions</h4>
                      <Button
                        onClick={() => setTerminalOutput('')}
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                      >
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Terminal output is shown in the main content area when available.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Code Editor or Preview */}
            <div className="flex min-h-0 flex-col">
              <Card className="min-h-0 h-full border border-border/50 shadow-lg bg-card/50 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl mb-1">
                        {view === 'code' ? 'Project Files & Code Editor' : 'Live Preview'}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {view === 'code' ? 'Browse and edit project files' : 'See your project running live'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                                              <Button
                          onClick={() => setView('code')}
                          variant={view === 'code' ? 'default' : 'outline'}
                          size="sm"
                        >
                          Code
                        </Button>
                        <Button
                          onClick={() => setView('preview')}
                          variant={view === 'preview' ? 'default' : 'outline'}
                          size="sm"
                          disabled={!previewUrl}
                        >
                          Preview
                        </Button>
                      </div>
                    {isGenerating && (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <span className="text-sm text-muted-foreground">Generating...</span>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <Separator />
                <CardContent className="min-h-0 h-full p-0">
                  <div className="h-full">
                    {view === 'code' ? (
                      (projectFiles || streamingResponse) ? (
                        <div className="h-full p-4">
                          <AIResponseRenderer 
                            response={isGenerating && streamingResponse ? streamingResponse : projectFiles} 
                            existingFiles={existingFiles}
                            useBoilerplate={true}
                            isStreaming={isGenerating && !!streamingResponse}
                            hasExistingProject={!!projectFiles && !isFirstResponse}
                            disableRuntime={true}
                            onParsedFiles={(files) => {
                              console.log('Received parsed files from AIResponseRenderer:', files.length)
                              setParsedFiles(files)
                            }}
                            terminalOutput={terminalOutput}
                          />
                        </div>
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <div className="text-center">
                            <div className="mb-6 text-6xl text-muted-foreground">📁</div>
                            <h3 className="text-lg font-semibold mb-2">No Project Files Yet</h3>
                            <p className="text-muted-foreground leading-relaxed">Generate your first AI response with code to see files appear in the file tree and Monaco editor</p>
                          </div>
                        </div>
                      )
                    ) : (
                      <div className="h-full">
                        {previewUrl ? (
                          <iframe
                            ref={iframeRef}
                            src={previewUrl}
                            className="w-full h-full border-0"
                            title="Project Preview"
                            allow="cross-origin-isolated"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <div className="text-center">
                              <div className="mb-6 text-6xl text-muted-foreground">🚀</div>
                              <h3 className="text-lg font-semibold mb-2">No Preview Available</h3>
                              <p className="text-muted-foreground leading-relaxed">Start the development server to see your project running live</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
