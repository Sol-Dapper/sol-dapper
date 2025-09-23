"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'

import { 
  FolderTree, 
  CheckCircle, 
  AlertTriangle,
  Info,
  Zap,
  Terminal,
  Download,
  Play
} from 'lucide-react'
import { Tree, type TreeViewElement } from '@/components/ui/file-tree'
import { CodeEditor } from '@/components/CodeEditor'
import { WebContainerRunner } from '@/components/WebContainerRunner'
import { AIResponseParser, type ParsedResponse, type ParsedFile } from '@/lib/xml-parser'
import { fetchBoilerplateComponents } from '@/lib/api'

interface AIResponseRendererProps {
  response: string
  existingFiles?: string // Existing files from previous responses
  useBoilerplate?: boolean // Flag to enable/disable boilerplate integration
  isStreaming?: boolean // Flag to indicate if response is being streamed
  hasExistingProject?: boolean // Flag to indicate if this is an existing project with files
  disableRuntime?: boolean // Flag to disable runtime/WebContainer integration
  onParsedFiles?: (files: ParsedFile[]) => void // Callback to get parsed files for external mounting
  terminalOutput?: string // Terminal output from project runtime
  fileTreeWidth?: number // Width of the file tree panel
  onFileTreeWidthChange?: (width: number) => void // Callback for file tree width changes
}

export function AIResponseRenderer({ response, existingFiles = "", useBoilerplate = true, isStreaming = false, hasExistingProject = false, disableRuntime = false, onParsedFiles, terminalOutput, fileTreeWidth = 220, onFileTreeWidthChange }: AIResponseRendererProps) {
  const [selectedFileId, setSelectedFileId] = useState<string>('')
  const [selectedFile, setSelectedFile] = useState<ParsedFile | null>(null)
  const [parsedResponse, setParsedResponse] = useState<ParsedResponse | null>(null)
  const [boilerplateComponents, setBoilerplateComponents] = useState<string>('')
  const [isLoadingBoilerplate, setIsLoadingBoilerplate] = useState<boolean>(false)
  const [streamingFileContent, setStreamingFileContent] = useState<string>('')
  const [boilerplateApplied, setBoilerplateApplied] = useState<boolean>(false)
  const [viewMode, setViewMode] = useState<'code' | 'runtime'>('code')
  const [shouldUpdateWebContainer, setShouldUpdateWebContainer] = useState<boolean>(false)
  const [lastSyncedFileCount, setLastSyncedFileCount] = useState<number>(0)
  
  const parser = useMemo(() => new AIResponseParser(), [])

  // Helper function to check if a file is from boilerplate
  const isBoilerplateFile = (filePath: string): boolean => {
    // Essential configuration files that should NEVER be overwritten
    const essentialFiles = [
      'package.json',
      'tsconfig.json', 
      'next.config.ts',
      'next.config.js',
      'postcss.config.mjs',
      'tailwind.config.js',
      'tailwind.config.ts',
      '.env',
      '.env.local',
      '.gitignore',
      'README.md'
    ]
    
    // Boilerplate component files
    const boilerplateComponents = [
      'app-footer.tsx',
      'wallet-button.tsx',
      'cluster-data-access.tsx',
      'cluster-ui.tsx',
      'theme-select.tsx',
      'react-query-provider.tsx',
      'theme-provider.tsx'
    ]
    
    // Essential directories and files
    const boilerplatePaths = [
      'src/app/globals.css',
      'src/app/layout.tsx',
      'anchor/',
      'src/components/app-',
      'src/components/solana/'
    ]
    
    // Normalize path for comparison
    const normalizedPath = filePath.replace(/^\/+/, '').toLowerCase()
    
    // Check if it's an essential file
    if (essentialFiles.some(file => normalizedPath.endsWith(file.toLowerCase()))) {
      return true
    }
    
    // Check if it's a boilerplate component
    if (boilerplateComponents.some(comp => normalizedPath.includes(comp.toLowerCase()))) {
      return true
    }
    
    // Check if it's in a boilerplate path
    if (boilerplatePaths.some(path => normalizedPath.includes(path.toLowerCase()))) {
      return true
    }
    
    return false
  }

  // Fetch boilerplate components on mount - ALWAYS fetch when useBoilerplate is true
  useEffect(() => {
    if (useBoilerplate) {
      setIsLoadingBoilerplate(true)
      setBoilerplateApplied(false) // Reset when useBoilerplate changes
      fetchBoilerplateComponents()
        .then(components => {
          setBoilerplateComponents(components)
          const uiComponentCount = (components.match(/src\/components\/ui\//g) || []).length;
          console.log('🔧 AIResponseRenderer - Boilerplate fetched:', {
            success: !!components,
            length: components.length,
            uiComponents: uiComponentCount,
            hasUIDirectory: components.includes('src/components/ui'),
            sample: components.substring(0, 200) + '...'
          })
        })
        .catch(error => {
          console.error('❌ AIResponseRenderer - Failed to fetch boilerplate:', error)
          setBoilerplateComponents('') // Fallback to empty
        })
        .finally(() => {
          setIsLoadingBoilerplate(false)
        })
    } else {
      setIsLoadingBoilerplate(false)
      setBoilerplateComponents('')
    }
  }, [useBoilerplate])

  useEffect(() => {
    if (response) {
      console.log('AIResponseRenderer - Input response:', response)
      console.log('AIResponseRenderer - Has existing files:', !!existingFiles)
      console.log('AIResponseRenderer - Boilerplate available:', !!boilerplateComponents)
      
      // Wait for boilerplate to load if needed
      if (useBoilerplate && isLoadingBoilerplate) {
        return // Wait for boilerplate to load
      }
      
      let parsed: ParsedResponse
      
      // SIMPLIFIED LOGIC: Always try to include boilerplate when available
      if (useBoilerplate && boilerplateComponents) {
        if (existingFiles) {
          // We have existing files - merge everything with boilerplate
          parsed = parser.parseResponseWithExistingFiles(response, existingFiles, boilerplateComponents)
          console.log('🔄 AIResponseRenderer - Merged response + existing + boilerplate')
        } else {
          // No existing files - merge response with boilerplate (ALWAYS for new projects)
          parsed = parser.parseResponseWithBoilerplate(response, boilerplateComponents)
          console.log('🔄 AIResponseRenderer - Merged response + boilerplate')
        }
        setBoilerplateApplied(true)
      } else if (existingFiles) {
        // No boilerplate available but we have existing files
        parsed = parser.parseResponseWithExistingFiles(response, existingFiles)
        console.log('🔄 AIResponseRenderer - Merged response + existing (no boilerplate)')
      } else {
        // Just parse the response as-is
        parsed = parser.parseResponse(response, isStreaming)
        console.log('🔄 AIResponseRenderer - Standard parsing (no boilerplate, no existing)', 'isStreaming:', isStreaming)
        
        // ENHANCED FALLBACK: If we should use boilerplate but didn't trigger above logic
        if (useBoilerplate && boilerplateComponents) {
          console.log('🔄 AIResponseRenderer - Forcing boilerplate for new project')
          parsed = parser.parseResponse(boilerplateComponents, false)
          setBoilerplateApplied(true)
        }
      }

      // Enhanced debugging for parsed results
      console.log('📊 AIResponseRenderer - Parse Results:', {
        totalFiles: parsed?.files?.length || 0,
        totalDirectories: parsed?.directories?.length || 0,
        uiFiles: parsed?.files?.filter(f => f.path?.includes('src/components/ui/')).length || 0,
        filePaths: parsed?.files?.map(f => f.path) || [],
        directoryPaths: parsed?.directories?.map(d => d.path) || [],
        hasBoilerplateFiles: parsed?.files?.some(f => f.path?.includes('package.json')) || false,
        responseLength: response?.length || 0,
        boilerplateLength: boilerplateComponents?.length || 0,
        useBoilerplate,
        isStreaming
      })
      
      // Only trigger WebContainer update if we're in runtime mode and have meaningful changes
      if (viewMode === 'runtime' && parsed.files.length !== lastSyncedFileCount) {
        setShouldUpdateWebContainer(true)
      }
      
      setParsedResponse(parsed)
      
      // Notify parent component about parsed files
      if (onParsedFiles && parsed.files.length > 0) {
        onParsedFiles(parsed.files)
      }
      
      // Debug logging to see what files we actually have
      console.log('🔍 DEBUG - Final parsed response:', {
        totalFiles: parsed.files.length,
        totalDirectories: parsed.directories.length,
        filesList: parsed.files.map(f => f.path),
        directoriesList: parsed.directories.map(d => d.path),
        hasBoilerplate: parsed.files.some(f => f.path.includes('package.json')),
        useBoilerplate,
        boilerplateApplied,
        boilerplateComponents: !!boilerplateComponents,
        hasExistingFiles: !!existingFiles,
        isStreaming
      })
    }
  }, [response, existingFiles, parser, useBoilerplate, boilerplateComponents, isLoadingBoilerplate, viewMode, lastSyncedFileCount, isStreaming])

  // Automatically select the first file when files are available and no file is selected
  useEffect(() => {
    if (parsedResponse && parsedResponse.files.length > 0 && !selectedFileId) {
      const firstFile = parsedResponse.files[0]
      if (firstFile) {
        setSelectedFileId(firstFile.id)
        setSelectedFile(firstFile)
      }
    }
  }, [parsedResponse, selectedFileId])

  // Ensure selected file is still valid when files change
  useEffect(() => {
    if (parsedResponse && selectedFileId) {
      const findFile = (files: ParsedFile[], id: string): ParsedFile | null => {
        for (const file of files) {
          if (file.id === id) return file
          if (file.children) {
            const found = findFile(file.children, id)
            if (found) return found
          }
        }
        return null
      }

      const allFiles = [...parsedResponse.files, ...parsedResponse.directories]
      const file = findFile(allFiles, selectedFileId)
      
      if (!file) {
        // Selected file no longer exists, select first available file
        const firstFile = parsedResponse.files[0]
        if (firstFile) {
          setSelectedFileId(firstFile.id)
          setSelectedFile(firstFile)
        } else {
          setSelectedFileId('')
          setSelectedFile(null)
        }
      } else if (file !== selectedFile) {
        // Update selected file if it changed
        setSelectedFile(file)
      }
    }
  }, [parsedResponse, selectedFileId, selectedFile])

  // Extract the streaming content for the selected file (LLM response only, not boilerplate)
  useEffect(() => {
    if (isStreaming && selectedFile && response) {
      // Check if this file is from boilerplate (don't stream boilerplate files)
      if (isBoilerplateFile(selectedFile.path)) {
        // For boilerplate files, show content immediately without streaming
        setStreamingFileContent(selectedFile.content)
        return
      }
      
      // For LLM-generated files, extract streaming content
      const escapedPath = selectedFile.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      
      // Look for the file pattern, but be more flexible with incomplete responses
      const fileStartPattern = new RegExp(`<forgeAction[^>]*filePath="${escapedPath}"[^>]*>`, 'i')
      const fileStartMatch = response.match(fileStartPattern)
      
      if (fileStartMatch) {
        const startIndex = response.indexOf(fileStartMatch[0]) + fileStartMatch[0].length
        
        // Find the end of this forgeAction (or end of response if incomplete)
        const endPattern = /<\/forgeAction>/g
        endPattern.lastIndex = startIndex
        const endMatch = endPattern.exec(response)
        
        const endIndex = endMatch ? endMatch.index : response.length
        
        // Extract the content between start and end
        const extractedContent = response.substring(startIndex, endIndex).trim()
        
        if (extractedContent && extractedContent !== streamingFileContent) {
          setStreamingFileContent(extractedContent)
        }
      } else {
        // If we can't find the file in the streaming response yet, 
        // use the parsed file content if available
        if (selectedFile.content && selectedFile.content !== streamingFileContent) {
          setStreamingFileContent(selectedFile.content)
        }
      }
    } else if (selectedFile && !isStreaming) {
      // When not streaming, use the final file content
      setStreamingFileContent(selectedFile.content)
    }
  }, [selectedFile, response, isStreaming, streamingFileContent])

  const treeData = useMemo(() => {
    if (!parsedResponse) return []
    
    // Create a Map to deduplicate files by path
    const uniqueFilesMap = new Map<string, ParsedFile>()
    const uniqueDirsMap = new Map<string, ParsedFile>()
    
    // Deduplicate files by path
    parsedResponse.files.forEach(file => {
      if (!uniqueFilesMap.has(file.path)) {
        uniqueFilesMap.set(file.path, {
          ...file,
          id: file.id || `file-${file.path.replace(/[^a-zA-Z0-9]/g, '-')}`
        })
      }
    })
    
    // Deduplicate directories by path
    parsedResponse.directories.forEach(dir => {
      if (!uniqueDirsMap.has(dir.path)) {
        uniqueDirsMap.set(dir.path, {
          ...dir,
          id: dir.id || `dir-${dir.path.replace(/[^a-zA-Z0-9]/g, '-')}`
        })
      }
    })
    
    const deduplicatedFiles = Array.from(uniqueFilesMap.values())
    const deduplicatedDirs = Array.from(uniqueDirsMap.values())
    
    const fileTree = AIResponseParser.filesToTree(deduplicatedFiles, deduplicatedDirs)
    
    // Convert to TreeViewElement format
    const convertToTreeElement = (file: ParsedFile): TreeViewElement => ({
      id: file.id,
      name: file.name,
      isSelectable: true,
      children: file.children?.map(convertToTreeElement),
    })

    return fileTree.map(convertToTreeElement)
  }, [parsedResponse])

  const handleFileSelect = (fileId: string) => {
    if (!parsedResponse) return
    
    setSelectedFileId(fileId)
    
    // Find the file in the parsed data
    const findFile = (files: ParsedFile[], id: string): ParsedFile | null => {
      for (const file of files) {
        if (file.id === id) return file
        if (file.children) {
          const found = findFile(file.children, id)
          if (found) return found
        }
      }
      return null
    }

    const allFiles = [...parsedResponse.files, ...parsedResponse.directories]
    const file = findFile(allFiles, fileId)
    setSelectedFile(file)
  }

  const downloadProject = async () => {
    if (!parsedResponse || parsedResponse.files.length === 0) {
      console.error('No files to download')
      return
    }

    try {
      // Import JSZip dynamically to avoid SSR issues
      const JSZip = (await import('jszip')).default
      const zip = new JSZip()

      // Add each file to the zip
      parsedResponse.files.forEach(file => {
        // Create directory structure in zip
        const filePath = file.path.startsWith('/') ? file.path.slice(1) : file.path
        zip.file(filePath, file.content)
      })

      // Add a README.md with project information
      const readme = `# Solana DApp Project

This project was generated using AI and includes ${parsedResponse.files.length} files.

## Getting Started

1. Install dependencies:
   \`\`\`bash
   npm install
   # or
   bun install
   \`\`\`

2. Start the development server:
   \`\`\`bash
   npm run dev
   # or
   bun dev
   \`\`\`

3. Build for production:
   \`\`\`bash
   npm run build
   # or
   bun run build
   \`\`\`

## Generated Files

This project includes:
- Next.js application with TypeScript
- Solana wallet integration
- Anchor program setup
- Tailwind CSS styling
- Essential UI components

Generated on: ${new Date().toISOString()}
`
      zip.file('README.md', readme)

      // Generate the zip file
      const content = await zip.generateAsync({ 
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: {
          level: 6
        }
      })
      
      // Create a more descriptive filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
      const filename = `solana-dapp-${timestamp}.zip`
      
      // Create download link
      const url = URL.createObjectURL(content)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      console.log(`Project downloaded successfully as ${filename}`)
    } catch (error) {
      console.error('Error downloading project:', error)
      // You could add a toast notification here to inform the user
    }
  }

  if (!parsedResponse) {
    console.log('⚠️ DEBUG - No parsed response, showing raw response')
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-6">
            <div className="mb-4 text-sm text-red-600">
              DEBUG: No parsed response - showing raw response
            </div>
            <pre className="whitespace-pre-wrap text-sm leading-relaxed">
              {response}
            </pre>
          </CardContent>
        </Card>
      </div>
    )
  }

  const hasFiles = parsedResponse.files.length > 0 || parsedResponse.directories.length > 0
  const hasReview = !!parsedResponse.review
  const hasArtifact = !!parsedResponse.artifact
  
  // Check if boilerplate was applied
  const hasBoilerplateFiles = parsedResponse.files.some(file => 
    file.path.includes('app-footer.tsx') || 
    file.path.includes('wallet-button.tsx') ||
    file.path.includes('cluster-data-access.tsx') ||
    file.path.includes('tailwind.config.js') ||
    file.path.includes('src/app/globals.css') ||
    file.path.includes('package.json')
  )
  
  console.log('🔍 DEBUG - Render check:', {
    hasFiles, 
    filesCount: parsedResponse.files.length, 
    directoriesCount: parsedResponse.directories.length,
    hasArtifact,
    hasBoilerplateFiles,
    firstFewFiles: parsedResponse.files.slice(0, 3).map(f => ({ path: f.path, name: f.name }))
  })

  return (
    <div className="space-y-6">


      {/* File Tree and Code Editor - Prioritized at Top */}
      {hasFiles && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-green-100 dark:bg-green-950 border border-green-200 dark:border-green-800 flex items-center justify-center">
              <FolderTree className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="font-semibold text-foreground">Project Files</h3>
            <Badge variant="secondary" className="text-xs">
              {parsedResponse.files.length} files
            </Badge>
            {isStreaming && parsedResponse.files.some(file => !isBoilerplateFile(file.path)) && (
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                  Generating...
                </span>
              </div>
            )}
            {shouldUpdateWebContainer && viewMode === 'runtime' && (
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                  Syncing to WebContainer...
                </span>
              </div>
            )}
            <div className="ml-auto flex items-center gap-2">
              {/* View Mode Toggle */}
                            <div className="flex rounded-lg border border-border/50 p-1">
                {!disableRuntime && (
                  <Button
                    variant={viewMode === 'runtime' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => {
                      setViewMode('runtime')
                      // Trigger WebContainer update when switching to runtime view
                      if (parsedResponse && parsedResponse.files.length > 0) {
                        setShouldUpdateWebContainer(true)
                      }
                    }}
                    className="flex items-center gap-2 h-8"
                  >
                    <Play className="h-4 w-4" />
                    Run
                  </Button>
                )}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={downloadProject}
                className="flex items-center gap-2"
                disabled={isStreaming}
                title="Download all project files as a ZIP archive"
              >
                <Download className="h-4 w-4" />
                Download Project
              </Button>
            </div>
          </div>
          
          {viewMode === 'code' || disableRuntime ? (
            <div className="flex gap-4">
              {/* File Tree */}
              <Card style={{width: `${fileTreeWidth}px`}} className="flex-shrink-0 h-[500px] overflow-hidden flex flex-col">
                <CardHeader className="flex-shrink-0 pb-3">
                  <CardTitle className="text-base">File Explorer</CardTitle>
                </CardHeader>
                <CardContent className="p-0 flex-1 overflow-hidden">
                  <ScrollArea className="h-full">
                    <div className="p-2">
                      <Tree
                        data={treeData}
                        handleSelect={handleFileSelect}
                        initialSelectedId={selectedFileId}
                        expandAll={true}
                      />
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Resize Handle */}
              {onFileTreeWidthChange && (
                <div 
                  className="w-1 bg-border/30 hover:bg-border cursor-col-resize flex items-center justify-center group"
                  onMouseDown={(e) => {
                    const startX = e.clientX
                    const startWidth = fileTreeWidth
                    
                    const handleMouseMove = (e: MouseEvent) => {
                      const deltaX = e.clientX - startX
                      const newWidth = Math.min(Math.max(startWidth + deltaX, 150), 400)
                      onFileTreeWidthChange(newWidth)
                    }
                    
                    const handleMouseUp = () => {
                      document.removeEventListener('mousemove', handleMouseMove)
                      document.removeEventListener('mouseup', handleMouseUp)
                    }
                    
                    document.addEventListener('mousemove', handleMouseMove)
                    document.addEventListener('mouseup', handleMouseUp)
                  }}
                >
                  <div className="w-0.5 h-8 bg-border/50 rounded group-hover:bg-border transition-colors"></div>
                </div>
              )}

              {/* Code Editor */}
              <div className="flex-1 min-w-0">
                {selectedFile ? (
                  <div className="relative">
                    {isStreaming && selectedFile && !isBoilerplateFile(selectedFile.path) && (
                      <div className="absolute top-4 right-4 z-10">
                        <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-1">
                          <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse"></div>
                          <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                            AI Writing...
                          </span>
                        </div>
                      </div>
                    )}
                    <CodeEditor
                      code={streamingFileContent || selectedFile.content}
                      language={selectedFile.language}
                      filename={selectedFile.name}
                      height={500}
                      readonly={true} // Make it readonly
                      isStreaming={isStreaming && !isBoilerplateFile(selectedFile.path)}
                      streamingSpeed={10} // Characters per interval
                    />
                  </div>
                ) : (
                  <Card className={`h-[calc(100vh-${600 + (terminalOutput ? 200 : 0)}px)] flex items-center justify-center`}>
                    <CardContent className="text-center">
                      <FolderTree className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        Select a file from the tree to view its contents
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          ) : (
            !disableRuntime && (
              <WebContainerRunner 
                files={parsedResponse.files} 
                isVisible={viewMode === 'runtime'}
                shouldUpdateFiles={shouldUpdateWebContainer}
                onFilesUpdated={() => {
                  setShouldUpdateWebContainer(false)
                  setLastSyncedFileCount(parsedResponse.files.length)
                }}
              />
            )
          )}
        </div>
      )}

      {/* Code Review */}
      {hasReview && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-orange-100 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 flex items-center justify-center">
              <CheckCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </div>
            <h3 className="font-semibold text-foreground">Code Review</h3>
          </div>
          
          <Card>
            <CardContent className="p-6 space-y-6">
              {/* Summary */}
              {parsedResponse.review?.summary && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-blue-500" />
                    <h4 className="font-medium">Summary</h4>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {parsedResponse.review.summary}
                  </p>
                </div>
              )}

              {/* Suggestions */}
              {parsedResponse.review?.suggestions && parsedResponse.review.suggestions.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <h4 className="font-medium">Suggestions</h4>
                  </div>
                  <ul className="space-y-2">
                    {parsedResponse.review.suggestions.map((suggestion, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <span className="text-green-500 mt-1">•</span>
                        <span className="text-muted-foreground leading-relaxed">
                          {suggestion}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Issues */}
              {parsedResponse.review?.issues && parsedResponse.review.issues.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <h4 className="font-medium">Issues</h4>
                  </div>
                  <ul className="space-y-2">
                    {parsedResponse.review.issues.map((issue, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <span className="text-amber-500 mt-1">•</span>
                        <span className="text-muted-foreground leading-relaxed">
                          {issue}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
} 