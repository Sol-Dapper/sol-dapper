"use client"

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Play, 
  RotateCcw, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  FileText,
  Terminal,
  FolderOpen
} from 'lucide-react'

import { Step, StepType, StepStatus, parseForgeXml } from '@/lib/steps'

interface BuilderProps {
  response: string
  onStepsChange?: (steps: Step[]) => void
}

function BuilderComponent({ response, onStepsChange }: BuilderProps) {
  const [steps, setSteps] = useState<Step[]>([])
  const [currentStepIndex, setCurrentStepIndex] = useState(-1)
  
  // Memoize parsed steps to prevent unnecessary recalculations
  const parsedSteps = useMemo(() => {
    if (response) {
      return parseForgeXml(response)
    }
    return []
  }, [response])

  // Update steps when parsed steps change
  useEffect(() => {
    setSteps(parsedSteps)
  }, [parsedSteps])

  // Notify parent of steps change (separate effect to prevent callback dependency issues)
  useEffect(() => {
    if (parsedSteps.length > 0) {
      onStepsChange?.(parsedSteps)
    }
  }, [parsedSteps, onStepsChange])

  const simulateStepExecution = (stepIndex: number) => {
    const step = steps[stepIndex]
    if (!step) return

    // Update step status to running
    const updatedSteps = [...steps]
    updatedSteps[stepIndex] = { ...step, status: 'running' }
    setSteps(updatedSteps)

    // Simulate execution time
    setTimeout(() => {
      updatedSteps[stepIndex] = { ...step, status: 'completed' }
      setSteps([...updatedSteps])
    }, 1000)
  }

  const simulateAllSteps = async () => {
    setCurrentStepIndex(0)

    for (let i = 0; i < steps.length; i++) {
      setCurrentStepIndex(i)
      simulateStepExecution(i)
      
      // Wait for each step to complete
      await new Promise(resolve => setTimeout(resolve, 1200))
    }

    setCurrentStepIndex(-1)
  }

  const resetSteps = () => {
    const resetSteps = steps.map(step => ({ ...step, status: 'pending' as StepStatus }))
    setSteps(resetSteps)
    setCurrentStepIndex(-1)
  }

  const getStepIcon = useCallback((step: Step, index: number) => {
    if (step.status === 'completed') return <CheckCircle className="h-4 w-4 text-green-500" />
    if (step.status === 'failed') return <AlertCircle className="h-4 w-4 text-red-500" />
    if (step.status === 'running' || index === currentStepIndex) return <Clock className="h-4 w-4 text-blue-500 animate-spin" />
    
    if (step.type === StepType.CreateFile) return <FileText className="h-4 w-4 text-gray-500" />
    if (step.type === StepType.CreateFolder) return <FolderOpen className="h-4 w-4 text-gray-500" />
    if (step.type === StepType.RunScript) return <Terminal className="h-4 w-4 text-gray-500" />
    
    return <Clock className="h-4 w-4 text-gray-400" />
  }, [currentStepIndex])

  const getStepBadgeVariant = (status: StepStatus) => {
    switch (status) {
      case 'completed': return 'default'
      case 'failed': return 'destructive'
      case 'running': return 'secondary'
      default: return 'outline'
    }
  }

  const getStepTypeLabel = (type: StepType) => {
    switch (type) {
      case StepType.CreateFile: return 'Create File'
      case StepType.CreateFolder: return 'Create Folder'
      case StepType.RunScript: return 'Run Command'
      case StepType.EditFile: return 'Edit File'
      case StepType.InstallPackage: return 'Install Package'
      default: return 'Unknown'
    }
  }

  // Handle WebContainer error state in JSX instead of early return

  return (
    <div className="space-y-6">
      {/* Parsing Results */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Parsing Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{steps.length}</div>
              <div className="text-sm text-gray-600">Total Steps</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {steps.filter(s => s.type === StepType.CreateFile).length}
              </div>
              <div className="text-sm text-gray-600">Files</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {steps.filter(s => s.type === StepType.CreateFolder).length}
              </div>
              <div className="text-sm text-gray-600">Folders</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {steps.filter(s => s.type === StepType.RunScript).length}
              </div>
              <div className="text-sm text-gray-600">Commands</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Parsed Steps</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {steps.filter(s => s.status === 'completed').length}/{steps.length} completed
              </Badge>
              <Button
                onClick={simulateAllSteps}
                disabled={currentStepIndex !== -1}
                size="sm"
              >
                <Play className="h-4 w-4 mr-2" />
                Simulate Execution
              </Button>
              <Button
                onClick={resetSteps}
                disabled={currentStepIndex !== -1}
                variant="outline"
                size="sm"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-3">
              {useMemo(() => 
                steps.map((step, index) => (
                  <div
                    key={step.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                      index === currentStepIndex ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {getStepIcon(step, index)}
                    </div>
                    <div className="flex-grow min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm truncate">{step.title}</h4>
                        <Badge variant="outline" className="text-xs">
                          {getStepTypeLabel(step.type)}
                        </Badge>
                        <Badge variant={getStepBadgeVariant(step.status)} className="text-xs">
                          {step.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600 mb-2">{step.description}</p>
                      {step.path && (
                        <div className="text-xs text-blue-600 mb-2">
                          <span className="font-medium">Path:</span> {step.path}
                        </div>
                      )}
                      {step.code && (
                        <details className="text-xs">
                          <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
                            Show content ({step.code.length} characters)
                          </summary>
                          <pre className="mt-2 bg-white p-2 rounded border overflow-x-auto max-h-32">
                            <code>{step.code}</code>
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                )), [steps, currentStepIndex, getStepIcon])}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* File Structure Preview */}
      {steps.filter(s => s.type === StepType.CreateFile && s.path).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">File Structure</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 font-mono text-sm">
              {steps
                .filter(s => s.type === StepType.CreateFile && s.path)
                .map((step, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <FileText className="h-3 w-3 text-gray-400" />
                    <span className="text-gray-700">{step.path}</span>
                    <span className="text-xs text-gray-500">
                      ({step.code?.length || 0} chars)
                    </span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export const Builder = React.memo(BuilderComponent) 