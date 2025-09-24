"use client"

import React, { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  Play, 
  Square, 
  Package, 
  Terminal, 
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  Monitor,
  Maximize2,
  RefreshCw
} from 'lucide-react'
import { webContainerService } from '@/lib/webcontainer'
import { InlineLoader } from '@/components/ui/loading-spinner'
import type { ParsedFile } from '@/lib/xml-parser'
import type { WebContainerProcess } from '@webcontainer/api'

interface WebContainerRunnerProps {
  files: ParsedFile[]
  isVisible: boolean
  shouldUpdateFiles?: boolean
  onFilesUpdated?: () => void
}

interface ExecutionStep {
  id: string
  name: string
  status: 'pending' | 'running' | 'success' | 'error'
  output?: string
  timestamp: number
}

export function WebContainerRunner({ files, isVisible, shouldUpdateFiles = false, onFilesUpdated }: WebContainerRunnerProps) {
  const [isContainerReady, setIsContainerReady] = useState(false)
  const [steps, setSteps] = useState<ExecutionStep[]>([])
  const [currentProcess, setCurrentProcess] = useState<WebContainerProcess | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [isRunning, setIsRunning] = useState(false)
  const [terminalOutput, setTerminalOutput] = useState<string>('')
  const [isInitializing, setIsInitializing] = useState(false)
  const [iframeLoading, setIframeLoading] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const terminalRef = useRef<HTMLDivElement>(null)

  // Initialize WebContainer when component becomes visible
  useEffect(() => {
    if (isVisible && files.length > 0 && !isContainerReady && !isInitializing) {
      initializeContainer()
    }
  }, [isVisible, files.length, isContainerReady, isInitializing])

  // Listen for server ready events
  useEffect(() => {
    if (isContainerReady) {
      webContainerService.onServerReady((port, url) => {
        console.log(`Server ready on port ${port}: ${url}`)
        setIframeLoading(true)
        setPreviewUrl(url)
      }).catch(console.error)
    }
  }, [isContainerReady])

  // Auto-scroll terminal output to bottom
  useEffect(() => {
    if (terminalRef.current && terminalOutput) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [terminalOutput])

  // Update files in WebContainer when shouldUpdateFiles changes
  useEffect(() => {
    if (shouldUpdateFiles && isContainerReady && files.length > 0) {
      updateFilesInContainer()
    }
  }, [shouldUpdateFiles, isContainerReady, files])

  const updateStep = (id: string, updates: Partial<ExecutionStep>) => {
    setSteps(prev => 
      prev.map(step => 
        step.id === id 
          ? { ...step, ...updates, timestamp: Date.now() }
          : step
      )
    )
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

  const initializeContainer = async () => {
    if (isInitializing) return
    
    setIsInitializing(true)
    try {
      addStep({
        id: 'init',
        name: 'Initializing WebContainer',
        status: 'running'
      })

      // Boot WebContainer
      await webContainerService.getWebContainer()
      
      updateStep('init', { status: 'success' })
      
      addStep({
        id: 'mount',
        name: 'Mounting project files',
        status: 'running'
      })

      // Mount files
      await webContainerService.mountFiles(files)
      
      updateStep('mount', { status: 'success' })
      setIsContainerReady(true)

    } catch (error) {
      console.error('Failed to initialize container:', error)
      updateStep('init', { 
        status: 'error', 
        output: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setIsInitializing(false)
    }
  }

  const updateFilesInContainer = async () => {
    if (!isContainerReady) return

    const stepId = `update-files-${Date.now()}`
    try {
      addStep({
        id: stepId,
        name: `Syncing ${files.length} files`,
        status: 'running'
      })

      // Update files efficiently (write individual files instead of re-mounting)
      await webContainerService.updateFiles(files)
      
      updateStep(stepId, { 
        status: 'success'
      })
      
      // Notify parent that files have been updated
      if (onFilesUpdated) {
        onFilesUpdated()
      }

    } catch (error) {
      console.error('Failed to update files in container:', error)
      updateStep(stepId, { 
        status: 'error', 
        output: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  const installDependencies = async () => {
    if (!isContainerReady) return

    const stepId = `install-${Date.now()}`
    try {
      addStep({
        id: stepId,
        name: 'Installing dependencies',
        status: 'running'
      })

      const result = await webContainerService.installDependencies()
      
      updateStep(stepId, { 
        status: result.success ? 'success' : 'error',
        output: result.output
      })

      setTerminalOutput(prev => prev + '\n' + result.output)

    } catch (error) {
      console.error('Failed to install dependencies:', error)
      updateStep(stepId, { 
        status: 'error', 
        output: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  const startDevServer = async () => {
    if (!isContainerReady || isRunning) return

    const stepId = `dev-${Date.now()}`
    try {
      setIsRunning(true)
      
      addStep({
        id: stepId,
        name: 'Starting development server',
        status: 'running'
      })

      const { process } = await webContainerService.startDevServer()
      setCurrentProcess(process)
      
      updateStep(stepId, { status: 'success' })

      // Monitor the process output
      const reader = process.output.getReader()
      const readOutput = async () => {
        try {
          while (true) {
            const { value, done } = await reader.read()
            if (done) break
            
            // Update terminal output with new data
            setTerminalOutput(prev => {
              const newOutput = prev + value
              // Keep only the last 10000 characters to prevent memory issues
              return newOutput.length > 10000 ? newOutput.slice(-10000) : newOutput
            })
          }
        } catch (error) {
          console.error('Error reading process output:', error)
        } finally {
          reader.releaseLock()
        }
      }
      
      readOutput()

    } catch (error) {
      console.error('Failed to start dev server:', error)
      updateStep(stepId, { 
        status: 'error', 
        output: error instanceof Error ? error.message : 'Unknown error'
      })
      setIsRunning(false)
    }
  }

  const stopDevServer = async () => {
    if (currentProcess) {
      try {
        currentProcess.kill()
        setCurrentProcess(null)
        setIsRunning(false)
        setPreviewUrl('')
        
        addStep({
          id: `stop-${Date.now()}`,
          name: 'Stopped development server',
          status: 'success'
        })
      } catch (error) {
        console.error('Failed to stop dev server:', error)
      }
    }
  }

  const getStepIcon = (status: ExecutionStep['status']) => {
    switch (status) {
      case 'running':
        return <InlineLoader size="sm" className="text-blue-500" />
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      default:
        return <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />
    }
  }

  const hasPackageJson = files.some(file => file.name === 'package.json')
  const canInstall = isContainerReady && hasPackageJson && !steps.some(s => s.id.startsWith('install') && s.status === 'running')
  const canStart = isContainerReady && !isRunning && steps.some(s => s.id.startsWith('install') && s.status === 'success')
  const canStop = isRunning && currentProcess

  if (!isVisible) {
    return null
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 flex items-center justify-center">
                <Image 
                  src="/dapperGithub.jpg" 
                  alt="Sol-Dapper" 
                  width={32} 
                  height={32} 
                  className="object-cover" 
                />
              </div>
              <div>
                <CardTitle className="text-xl">WebContainer Runtime</CardTitle>
                <p className="text-sm text-muted-foreground">Run your generated project in the browser</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={isContainerReady ? "default" : "secondary"}>
                {isContainerReady ? "Ready" : "Initializing"}
              </Badge>
              {previewUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(previewUrl, '_blank')}
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open in New Tab
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="space-y-6 pt-6">
          {/* Control Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={installDependencies}
              disabled={!canInstall}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Package className="h-4 w-4" />
              Install Dependencies
              {!hasPackageJson && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  No package.json
                </Badge>
              )}
            </Button>
            
            <Button
              onClick={startDevServer}
              disabled={!canStart}
              className="flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              {isRunning ? 'Server Running' : 'Start Dev Server'}
            </Button>
            
            <Button
              onClick={stopDevServer}
              disabled={!canStop}
              variant="destructive"
              className="flex items-center gap-2"
            >
              <Square className="h-4 w-4" />
              Stop Server
            </Button>
            
            {isRunning && (
              <Badge variant="default" className="animate-pulse">
                🟢 Server Active
              </Badge>
            )}
          </div>

          {/* Main Content Grid - Terminal and Preview */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Terminal Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Terminal className="h-5 w-5" />
                <h4 className="font-semibold">Terminal & Execution Log</h4>
              </div>
              
              <Card className="h-[500px]">
                <CardContent className="p-0 h-full">
                  <ScrollArea className="h-full">
                    <div className="p-4 space-y-3">
                      {/* Execution Steps */}
                      {steps.map((step) => (
                        <div key={step.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                          {getStepIcon(step.status)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="font-medium text-sm">{step.name}</p>
                              <span className="text-xs text-muted-foreground">
                                {new Date(step.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            {step.output && (
                              <div className="mt-2 p-2 bg-black/90 text-green-400 rounded text-xs font-mono max-h-32 overflow-y-auto">
                                {step.output}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      
                      {/* Live Terminal Output */}
                      {terminalOutput && (
                        <div className="mt-4">
                          <div className="bg-black/95 text-green-400 rounded-lg overflow-hidden">
                            <div className="flex items-center gap-2 p-3 border-b border-green-800/50 bg-black/90">
                              <Terminal className="h-3 w-3" />
                              <span className="text-green-300 font-semibold">Live Terminal Output</span>
                              <div className="ml-auto flex items-center gap-1">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                <span className="text-xs text-green-400">Live</span>
                              </div>
                            </div>
                            <div 
                              ref={terminalRef}
                              className="p-4 h-48 overflow-y-auto font-mono text-xs scrollbar-thin scrollbar-thumb-green-800 scrollbar-track-black/50"
                            >
                              <pre className="whitespace-pre-wrap">
                                {terminalOutput}
                                <span className="animate-pulse">▋</span>
                              </pre>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Preview Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  <h4 className="font-semibold">Live Preview</h4>
                </div>
                {previewUrl && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIframeLoading(true)
                        if (iframeRef.current) {
                          iframeRef.current.src = iframeRef.current.src
                        }
                      }}
                      className="flex items-center gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Refresh
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(previewUrl, '_blank')}
                      className="flex items-center gap-2"
                    >
                      <Maximize2 className="h-4 w-4" />
                      Open in New Tab
                    </Button>
                  </div>
                )}
              </div>

              <Card className="h-[500px]">
                <CardContent className="p-0 h-full">
                  {previewUrl ? (
                    <div className="h-full rounded-lg overflow-hidden border relative">
                      {iframeLoading && (
                        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10">
                          <InlineLoader size="md" text="Loading preview..." className="font-medium" />
                        </div>
                      )}
                      <iframe
                        ref={iframeRef}
                        src={previewUrl}
                        className="w-full h-full"
                        title="Project Preview"
                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
                        onLoad={() => setIframeLoading(false)}
                        onError={() => setIframeLoading(false)}
                      />
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-center">
                      <div>
                        <Monitor className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                        <h5 className="font-medium text-lg mb-2">No Preview Available</h5>
                        <p className="text-muted-foreground text-sm">
                          {!isContainerReady 
                            ? "Initialize WebContainer first" 
                            : !steps.some(s => s.id.startsWith('install') && s.status === 'success')
                            ? "Install dependencies to enable preview"
                            : !isRunning
                            ? "Start the development server to see preview"
                            : "Starting server, preview will appear shortly..."
                          }
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 