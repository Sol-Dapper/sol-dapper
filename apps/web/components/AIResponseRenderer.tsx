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
  Download
} from 'lucide-react'
import { Tree, type TreeViewElement } from '@/components/ui/file-tree'
import { CodeEditor } from '@/components/CodeEditor'
import { AIResponseParser, type ParsedResponse, type ParsedFile } from '@/lib/xml-parser'
import { fetchBoilerplateComponents } from '@/lib/api'

interface AIResponseRendererProps {
  response: string
  useBoilerplate?: boolean // Flag to enable/disable boilerplate integration
  isStreaming?: boolean // Flag to indicate if response is being streamed
  hasExistingProject?: boolean // Flag to indicate if this is an existing project with files
}

export function AIResponseRenderer({ response, useBoilerplate = true, isStreaming = false, hasExistingProject = false }: AIResponseRendererProps) {
  const [selectedFileId, setSelectedFileId] = useState<string>('')
  const [selectedFile, setSelectedFile] = useState<ParsedFile | null>(null)
  const [parsedResponse, setParsedResponse] = useState<ParsedResponse | null>(null)
  const [boilerplateComponents, setBoilerplateComponents] = useState<string>('')
  const [isLoadingBoilerplate, setIsLoadingBoilerplate] = useState<boolean>(false)
  const [streamingFileContent, setStreamingFileContent] = useState<string>('')
  const [boilerplateApplied, setBoilerplateApplied] = useState<boolean>(false)
  
  const parser = useMemo(() => new AIResponseParser(), [])

  // Helper function to check if a file is from boilerplate
  const isBoilerplateFile = (filePath: string): boolean => {
    return filePath.includes('app-footer.tsx') || 
           filePath.includes('wallet-button.tsx') ||
           filePath.includes('cluster-data-access.tsx') ||
           filePath.includes('cluster-ui.tsx') ||
           filePath.includes('theme-select.tsx') ||
           filePath.includes('tailwind.config.js') ||
           filePath.includes('src/app/globals.css') ||
           filePath.includes('package.json') ||
           filePath.includes('tsconfig.json') ||
           filePath.includes('next.config.ts') ||
           filePath.includes('postcss.config.mjs') ||
           filePath.includes('anchor/') ||
           filePath.includes('src/app/layout.tsx') ||
           filePath.includes('src/app/page.tsx') ||
           filePath.includes('src/components/app-') ||
           filePath.includes('src/components/solana/') ||
           filePath.includes('src/components/react-query-provider.tsx') ||
           filePath.includes('src/components/theme-provider.tsx')
  }

  // Fetch boilerplate components on mount
  useEffect(() => {
    if (useBoilerplate && !hasExistingProject) {
      setIsLoadingBoilerplate(true)
      setBoilerplateApplied(false) // Reset when useBoilerplate changes
      fetchBoilerplateComponents()
        .then(components => {
          setBoilerplateComponents(components)
          console.log('AIResponseRenderer - Boilerplate components fetched:', components ? 'success' : 'empty')
        })
        .catch(error => {
          console.error('AIResponseRenderer - Failed to fetch boilerplate:', error)
          setBoilerplateComponents('') // Fallback to empty
        })
        .finally(() => {
          setIsLoadingBoilerplate(false)
        })
    } else {
      setBoilerplateApplied(hasExistingProject) // For existing projects, mark as applied immediately
    }
  }, [useBoilerplate, hasExistingProject])

  useEffect(() => {
    if (response) {
      console.log('AIResponseRenderer - Input response:', response)
      
      // Wait for boilerplate to load if needed
      if (useBoilerplate && isLoadingBoilerplate) {
        return // Wait for boilerplate to load
      }
      
      let parsed: ParsedResponse
      
      if (hasExistingProject && !boilerplateApplied) {
        // Existing project: parse the full response (which includes existing files + new streaming content)
        parsed = parser.parseResponse(response)
        setBoilerplateApplied(true) // Mark as applied since existing project already has boilerplate
        console.log('AIResponseRenderer - Parsed existing project:', parsed)
      } else if (useBoilerplate && boilerplateComponents && !boilerplateApplied) {
        // New project: merge boilerplate with AI response
        parsed = parser.parseResponseWithBoilerplate(response, boilerplateComponents)
        setBoilerplateApplied(true)
        console.log('AIResponseRenderer - Applied boilerplate for new project:', parsed)
      } else if (boilerplateApplied && parsedResponse) {
        // Subsequent updates: preserve existing files and merge with new AI content
        const aiResult = parser.parseResponse(response)
        
        // For existing projects, preserve ALL existing files, not just boilerplate
        const existingFiles = hasExistingProject ? parsedResponse.files : parsedResponse.files.filter(file => isBoilerplateFile(file.path))
        const existingDirs = hasExistingProject ? parsedResponse.directories : parsedResponse.directories.filter(dir => isBoilerplateFile(dir.path))
        
        // Merge existing files with new AI files
        const mergedFiles = [...existingFiles]
        const mergedDirs = [...existingDirs]
        
        // Add or update AI files with consistent IDs
        aiResult.files.forEach(aiFile => {
          const existingIndex = mergedFiles.findIndex(f => f.path === aiFile.path)
          if (existingIndex >= 0 && mergedFiles[existingIndex]) {
            // Update existing file but preserve the ID to prevent key conflicts
            mergedFiles[existingIndex] = {
              ...aiFile,
              id: mergedFiles[existingIndex].id
            }
          } else {
            // Add new file with consistent ID
            mergedFiles.push({
              ...aiFile,
              id: `file-${aiFile.path.replace(/[^a-zA-Z0-9]/g, '-')}`
            })
          }
        })
        
        // Add new AI directories with consistent IDs
        aiResult.directories.forEach(aiDir => {
          const existingIndex = mergedDirs.findIndex(d => d.path === aiDir.path)
          if (existingIndex < 0) {
            mergedDirs.push({
              ...aiDir,
              id: `dir-${aiDir.path.replace(/[^a-zA-Z0-9]/g, '-')}`
            })
          }
        })
        
        parsed = {
          files: mergedFiles,
          directories: mergedDirs,
          codeBlocks: [...(parsedResponse.codeBlocks || []), ...aiResult.codeBlocks],
          text: aiResult.text || parsedResponse.text,
          review: aiResult.review || parsedResponse.review,
          artifact: aiResult.artifact || parsedResponse.artifact,
          steps: [...(parsedResponse.steps || []), ...(aiResult.steps || [])],
        }
        console.log('AIResponseRenderer - Preserved existing files and merged AI content:', {
          totalFiles: parsed.files.length,
          totalDirectories: parsed.directories.length,
          existingFiles: existingFiles.length,
          aiFiles: aiResult.files.length,
          aiDirectories: aiResult.directories.length
        })
      } else {
        // Standard parsing (no boilerplate)
        parsed = parser.parseResponse(response)
        console.log('AIResponseRenderer - Standard parsing:', parsed)
      }
      
      setParsedResponse(parsed)
    }
  }, [response, parser, useBoilerplate, boilerplateComponents, isLoadingBoilerplate])

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
    
    const deduplicatedFiles = parsedResponse.files.map(file => ({
      ...file,
      id: `file-${file.path.replace(/[^a-zA-Z0-9]/g, '-')}`
    }))
    
    const deduplicatedDirs = parsedResponse.directories.map(dir => ({
      ...dir,
      id: `dir-${dir.path.replace(/[^a-zA-Z0-9]/g, '-')}`
    }))
    
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
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-6">
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
  
  console.log('AIResponseRenderer - hasFiles:', hasFiles, 'files:', parsedResponse.files.length, 'directories:', parsedResponse.directories.length)
  console.log('AIResponseRenderer - hasArtifact:', hasArtifact)

  return (
    <div className="space-y-6">
      {/* Boilerplate Indicator */}
      {hasBoilerplateFiles && useBoilerplate && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 flex items-center justify-center">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Boilerplate Components Applied</h3>
              <p className="text-sm text-muted-foreground">Essential Solana DApp components have been added to your project</p>
            </div>
          </div>
        </div>
      )}

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
            <div className="ml-auto">
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
          
          <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4">
            {/* File Tree */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">File Explorer</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[600px]">
                  <div className="p-4">
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

            {/* Code Editor */}
            <div>
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
                    height={600}
                    readonly={false} // Make it editable
                    isStreaming={isStreaming && !isBoilerplateFile(selectedFile.path)}
                    streamingSpeed={10} // Characters per interval
                  />
                </div>
              ) : (
                <Card className="h-[600px] flex items-center justify-center">
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
        </div>
      )}

      {/* Artifact Header */}
      {hasArtifact && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-indigo-100 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center">
              <Zap className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{parsedResponse.artifact!.title}</h3>
              <p className="text-sm text-muted-foreground">ID: {parsedResponse.artifact!.id}</p>
            </div>
          </div>
          
          {parsedResponse.artifact!.shellCommands.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Terminal className="h-4 w-4" />
                  Shell Commands
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {parsedResponse.artifact!.shellCommands.map((command, index) => (
                    <div key={index} className="bg-muted/50 rounded-md p-3 font-mono text-sm">
                      <code>{command}</code>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}



      {/* Code Blocks - Removed: Files are now shown only in the file tree + Monaco editor above */}

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