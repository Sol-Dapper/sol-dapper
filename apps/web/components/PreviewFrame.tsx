"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  ExternalLink, 
  RefreshCw, 
  AlertCircle, 
  Loader2,
  Globe
} from 'lucide-react'
import { WebContainer } from '@webcontainer/api'
import { FileItem } from '@/lib/fileUtils'

interface PreviewFrameProps {
  files: FileItem[]
  webContainer: WebContainer
}

export function PreviewFrame({ files, webContainer }: PreviewFrameProps) {
  const [url, setUrl] = useState("")
  const [isStarting, setIsStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [serverStatus, setServerStatus] = useState<'idle' | 'installing' | 'starting' | 'running' | 'error'>('idle')

  const startDevServer = useCallback(async () => {
    if (!webContainer) return

    try {
      setIsStarting(true)
      setError(null)
      setServerStatus('installing')

      // Check if package.json exists
      const hasPackageJson = files.some(file => file.name === 'package.json' || file.path === 'package.json')
      
      if (hasPackageJson) {
        // Install dependencies
        console.log('Installing dependencies...')
        const installProcess = await webContainer.spawn('npm', ['install'])
        const installExitCode = await installProcess.exit
        
        if (installExitCode !== 0) {
          throw new Error('Failed to install dependencies')
        }
      }

      setServerStatus('starting')
      console.log('Starting dev server...')
      
      // Try different dev server commands
      const devCommands = ['npm run dev', 'npm start', 'yarn dev', 'yarn start']
      let serverStarted = false
      
      for (const command of devCommands) {
        try {
          const [cmd, ...args] = command.split(' ')
          if (cmd) {
            await webContainer.spawn(cmd, args)
            serverStarted = true
            break
          }
        } catch {
          console.warn(`Failed to start with command: ${command}`)
          continue
        }
      }

      if (!serverStarted) {
        // Fallback to basic HTTP server for static files
        console.log('Starting basic HTTP server...')
        await webContainer.spawn('npx', ['serve', '-s', '.', '-p', '3000'])
      }

      setServerStatus('running')
    } catch (err) {
      console.error('Failed to start dev server:', err)
      setError(err instanceof Error ? err.message : 'Failed to start dev server')
      setServerStatus('error')
    } finally {
      setIsStarting(false)
    }
  }, [webContainer, files])

  const refreshPreview = () => {
    if (url) {
      // Force iframe reload
      const iframe = document.querySelector('iframe[src*="webcontainer"]') as HTMLIFrameElement
      if (iframe) {
        const currentSrc = iframe.src
        iframe.src = currentSrc
      }
    }
  }

  const openInNewTab = () => {
    if (url) {
      window.open(url, '_blank')
    }
  }

  // Listen for server ready events
  useEffect(() => {
    if (!webContainer) return

    const handleServerReady = (port: number, serverUrl: string) => {
      console.log(`Server ready on port ${port}: ${serverUrl}`)
      setUrl(serverUrl)
      setServerStatus('running')
    }

    webContainer.on('server-ready', handleServerReady)

    // WebContainer doesn't have an 'off' method, but the cleanup isn't critical
    // since the effect will re-run when webContainer changes
    return () => {
      // No cleanup needed
    }
  }, [webContainer])

  // Auto-start server when files are first available
  useEffect(() => {
    if (files.length > 0 && serverStatus === 'idle') {
      const timer = setTimeout(() => {
        startDevServer()
      }, 1000) // Delay to prevent rapid re-triggers
      
      return () => clearTimeout(timer)
    }
  }, [files.length, serverStatus, startDevServer])

  const getStatusBadge = () => {
    switch (serverStatus) {
      case 'installing':
        return <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Installing</Badge>
      case 'starting':
        return <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Starting</Badge>
      case 'running':
        return <Badge variant="default"><Globe className="h-3 w-3 mr-1" />Running</Badge>
      case 'error':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Error</Badge>
      default:
        return <Badge variant="outline">Idle</Badge>
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Preview
          </CardTitle>
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            {url && (
              <>
                <Button
                  onClick={refreshPreview}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
                <Button
                  onClick={openInNewTab}
                  variant="outline"
                  size="sm"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open
                </Button>
              </>
            )}
            {!url && serverStatus === 'idle' && (
              <Button
                onClick={startDevServer}
                disabled={isStarting}
                size="sm"
              >
                {isStarting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Starting...
                  </>
                ) : (
                  'Start Server'
                )}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">Server Error</span>
            </div>
            <p className="text-sm text-red-600 mt-1">{error}</p>
          </div>
        )}
        
        <div className="border rounded-lg overflow-hidden bg-white" style={{ height: '500px' }}>
          {url ? (
            <iframe
              src={url}
              width="100%"
              height="100%"
              className="border-0"
              title="Preview"
            />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              <div className="text-center">
                {serverStatus === 'installing' && (
                  <>
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                    <p>Installing dependencies...</p>
                  </>
                )}
                {serverStatus === 'starting' && (
                  <>
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                    <p>Starting development server...</p>
                  </>
                )}
                {serverStatus === 'idle' && (
                  <>
                    <Globe className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p>Preview will appear here once the server starts</p>
                  </>
                )}
                {serverStatus === 'error' && (
                  <>
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 text-red-400" />
                    <p>Failed to start preview server</p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
} 