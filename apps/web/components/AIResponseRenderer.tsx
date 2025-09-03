"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'

import { 
  FileText, 
  Code2, 
  FolderTree, 
  CheckCircle, 
  AlertTriangle,
  Info,
  Zap,
  Terminal
} from 'lucide-react'
import { Tree, type TreeViewElement } from '@/components/ui/file-tree'
import { CodeEditor, CodeViewer } from '@/components/CodeEditor'
import { AIResponseParser, type ParsedResponse, type ParsedFile } from '@/lib/xml-parser'

interface AIResponseRendererProps {
  response: string
}

export function AIResponseRenderer({ response }: AIResponseRendererProps) {
  const [selectedFileId, setSelectedFileId] = useState<string>('')
  const [selectedFile, setSelectedFile] = useState<ParsedFile | null>(null)
  const [parsedResponse, setParsedResponse] = useState<ParsedResponse | null>(null)
  
  const parser = useMemo(() => new AIResponseParser(), [])

  useEffect(() => {
    if (response) {
      console.log('AIResponseRenderer - Input response:', response)
      const parsed = parser.parseResponse(response)
      console.log('AIResponseRenderer - Parsed response:', parsed)
      setParsedResponse(parsed)
    }
  }, [response, parser])

  const treeData = useMemo(() => {
    if (!parsedResponse) return []
    
    const allFiles = [...parsedResponse.files]
    const fileTree = AIResponseParser.filesToTree(allFiles, parsedResponse.directories)
    
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
  const hasCode = parsedResponse.codeBlocks.length > 0
  const hasReview = !!parsedResponse.review
  const hasArtifact = !!parsedResponse.artifact
  
  console.log('AIResponseRenderer - hasFiles:', hasFiles, 'files:', parsedResponse.files.length, 'directories:', parsedResponse.directories.length)
  console.log('AIResponseRenderer - hasCode:', hasCode, 'codeBlocks:', parsedResponse.codeBlocks.length)
  console.log('AIResponseRenderer - hasArtifact:', hasArtifact)

  return (
    <div className="space-y-6">
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

      {/* Plain Text Response */}
      {parsedResponse.text && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 flex items-center justify-center">
              <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="font-semibold text-foreground">AI Response</h3>
          </div>
          <Card>
            <CardContent className="p-6">
              <pre className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {parsedResponse.text}
              </pre>
            </CardContent>
          </Card>
        </div>
      )}

      {/* File Tree and Code Editor */}
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
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* File Tree */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">File Explorer</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-96">
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
            <div className="lg:col-span-2">
              {selectedFile ? (
                <CodeEditor
                  code={selectedFile.content}
                  language={selectedFile.language}
                  filename={selectedFile.name}
                  height={400}
                  readonly={true}
                />
              ) : (
                <Card className="h-[400px] flex items-center justify-center">
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

      {/* Code Blocks */}
      {hasCode && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-purple-100 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 flex items-center justify-center">
              <Code2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="font-semibold text-foreground">Code Examples</h3>
            <Badge variant="secondary" className="text-xs">
              {parsedResponse.codeBlocks.length} blocks
            </Badge>
          </div>
          <CodeViewer codeBlocks={parsedResponse.codeBlocks} />
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