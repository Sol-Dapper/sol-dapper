"use client"

import React, { useRef } from 'react'
import Editor, { Monaco } from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Copy, Download } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CodeEditorProps {
  code: string
  language: string
  filename?: string
  readonly?: boolean
  height?: string | number
  theme?: 'light' | 'dark' | 'auto'
  className?: string
  showHeader?: boolean
  showActions?: boolean
  onChange?: (value: string | undefined) => void
}

export function CodeEditor({
  code,
  language,
  filename,
  readonly = true,
  height = 400,
  theme = 'auto',
  className,
  showHeader = true,
  showActions = true,
  onChange,
}: CodeEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)

  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor, monaco: Monaco) => {
    editorRef.current = editor

    // Configure Monaco editor
    monaco.editor.defineTheme('solana-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6A9955' },
        { token: 'keyword', foreground: 'C586C0' },
        { token: 'string', foreground: 'CE9178' },
        { token: 'number', foreground: 'B5CEA8' },
        { token: 'type', foreground: '4EC9B0' },
        { token: 'function', foreground: 'DCDCAA' },
      ],
      colors: {
        'editor.background': '#0d1117',
        'editor.foreground': '#c9d1d9',
        'editorLineNumber.foreground': '#6e7681',
        'editor.selectionBackground': '#264f78',
        'editor.inactiveSelectionBackground': '#3a3d41',
      },
    })

    monaco.editor.defineTheme('solana-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '008000' },
        { token: 'keyword', foreground: '0000FF' },
        { token: 'string', foreground: 'A31515' },
        { token: 'number', foreground: '098658' },
        { token: 'type', foreground: '267F99' },
        { token: 'function', foreground: '795E26' },
      ],
      colors: {
        'editor.background': '#ffffff',
        'editor.foreground': '#24292e',
        'editorLineNumber.foreground': '#959da5',
        'editor.selectionBackground': '#c8c8fa',
        'editor.inactiveSelectionBackground': '#e1e4e8',
      },
    })
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code)
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy code:', err)
    }
  }

  const downloadFile = () => {
    const blob = new Blob([code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename || `code.${getFileExtension(language)}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const getFileExtension = (lang: string): string => {
    const extensions: { [key: string]: string } = {
      javascript: 'js',
      typescript: 'ts',
      python: 'py',
      rust: 'rs',
      go: 'go',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      csharp: 'cs',
      php: 'php',
      ruby: 'rb',
      swift: 'swift',
      kotlin: 'kt',
      html: 'html',
      css: 'css',
      json: 'json',
      xml: 'xml',
      yaml: 'yml',
      markdown: 'md',
      bash: 'sh',
      sql: 'sql',
    }
    return extensions[lang] || 'txt'
  }

  const getTheme = () => {
    if (theme === 'auto') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'solana-dark'
        : 'solana-light'
    }
    return theme === 'dark' ? 'solana-dark' : 'solana-light'
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      {showHeader && (
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="text-lg font-semibold">
                {filename || `Code (${language})`}
              </CardTitle>
              <Badge variant="secondary" className="text-xs">
                {language}
              </Badge>
            </div>
            {showActions && (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyToClipboard}
                  className="h-8 w-8 p-0"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={downloadFile}
                  className="h-8 w-8 p-0"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
      )}
      <CardContent className="p-0">
        <div className="border-t">
          <Editor
            height={height}
            defaultLanguage={language}
            defaultValue={code}
            theme={getTheme()}
            onMount={handleEditorDidMount}
            onChange={onChange}
            options={{
              readOnly: readonly,
              minimap: { enabled: true },
              fontSize: 14,
              lineNumbers: 'on',
              roundedSelection: false,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              insertSpaces: true,
              wordWrap: 'on',
              contextmenu: true,
              copyWithSyntaxHighlighting: true,
              folding: true,
              foldingStrategy: 'indentation',
              showFoldingControls: 'always',
              unfoldOnClickAfterEndOfLine: true,
              bracketPairColorization: {
                enabled: true,
              },
              guides: {
                bracketPairs: true,
                indentation: true,
              },
              quickSuggestions: !readonly,
              parameterHints: {
                enabled: !readonly,
              },
            }}
          />
        </div>
      </CardContent>
    </Card>
  )
}

interface CodeViewerProps {
  codeBlocks: Array<{
    id: string
    language: string
    content: string
    filename?: string
  }>
  className?: string
}

export function CodeViewer({ codeBlocks, className }: CodeViewerProps) {
  if (codeBlocks.length === 0) {
    return null
  }

  return (
    <div className={cn('space-y-6', className)}>
      {codeBlocks.map((block) => (
        <CodeEditor
          key={block.id}
          code={block.content}
          language={block.language}
          filename={block.filename}
          readonly={true}
          height={Math.min(600, Math.max(200, block.content.split('\n').length * 20))}
        />
      ))}
    </div>
  )
} 