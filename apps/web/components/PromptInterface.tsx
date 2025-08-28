"use client";

import { useState, useEffect, JSX } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Separator } from "./ui/separator";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "components/ui/select";
import { Send, Loader2, AlertCircle } from "lucide-react";

interface Project {
  id: string;
  description: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

type ProjectStatus = 'creating' | 'generating' | 'completed' | 'error';

interface ProjectWithStatus extends Project {
  status?: ProjectStatus;
}

// Available OpenAI models
const AVAILABLE_MODELS = [
  { value: 'gpt-4o', label: 'GPT-4o (Latest)' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  { value: 'gpt-4', label: 'GPT-4' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
] as const;

export function PromptInterface(): JSX.Element {
  const { getAccessToken } = usePrivy();
  const [prompt, setPrompt] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("gpt-4o");
  const [projects, setProjects] = useState<ProjectWithStatus[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [streamingResponse, setStreamingResponse] = useState<string>("");
  const [error, setError] = useState<string>("");

  // Load existing projects on mount
  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async (): Promise<void> => {
    try {
      const token = await getAccessToken();
      console.log("here is the token",token)
      if (!token) {
        setError("Failed to get authentication token");
        return;
      }

      const response = await fetch('http://localhost:3001/projects', {
        headers: {
          'Authorization': token,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.message || response.statusText;
        throw new Error(`Failed to load projects: ${errorMessage}`);
      }

      const projectsData: Project[] = await response.json();
      setProjects(projectsData.map(p => ({ ...p, status: 'completed' })));
    } catch (err) {
      console.error('Error loading projects:', err);
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    }
  };

  const handleSubmit = async (): Promise<void> => {
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setStreamingResponse("");
    setError("");
    
    // Create temporary project for immediate feedback
    const tempProject: ProjectWithStatus = {
      id: `temp-${Date.now()}`,
      description: prompt.split('\n')[0] || prompt,
      userId: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'creating'
    };
    
    setProjects(prev => [tempProject, ...prev]);

    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error("Failed to get authentication token");
      }

      // Step 1: Create the project
      setStreamingResponse("🚀 Creating project...\n\n");
      
      const projectResponse = await fetch('http://localhost:3001/project', {
        method: 'POST',
        headers: {
          'Authorization': token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      if (!projectResponse.ok) {
        const errorData = await projectResponse.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.message || projectResponse.statusText;
        throw new Error(`Failed to create project: ${errorMessage}`);
      }

      const projectResult = await projectResponse.json();
      const projectId = projectResult.project;
      
      // Update streaming response and project status
      setStreamingResponse(prev => prev + "✅ Project created successfully!\n\n");
      setStreamingResponse(prev => prev + `📝 Project ID: ${projectId}\n`);
      setStreamingResponse(prev => prev + `📋 Description: ${prompt.split('\n')[0]}\n\n`);
      setStreamingResponse(prev => prev + "🤖 Generating AI response...\n\n");
      
      // Update the temporary project with the real project ID
      setProjects(prev => 
        prev.map(p => 
          p.id === tempProject.id 
            ? { 
                ...p, 
                id: projectId,
                status: 'generating' as ProjectStatus
              }
            : p
        )
      );

      // Step 2: Send the prompt to chat endpoint for AI response
      const chatResponse = await fetch('http://localhost:3001/chat', {
        method: 'POST',
        headers: {
          'Authorization': token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt,
          projectId,
          model: selectedModel
        }),
      });

      if (!chatResponse.ok) {
        const errorData = await chatResponse.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.message || chatResponse.statusText;
        throw new Error(`Failed to get AI response: ${errorMessage}`);
      }

      // Handle streaming response
      const reader = chatResponse.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) {
        throw new Error('No response stream available');
      }

      setStreamingResponse(''); // Clear any previous content

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            break;
          }
          
          const chunk = decoder.decode(value, { stream: true });
          setStreamingResponse(prev => prev + chunk);
        }
      } finally {
        reader.releaseLock();
      }

      // Update the project with completed status
      setProjects(prev => 
        prev.map(p => 
          p.id === projectId 
            ? { ...p, status: 'completed' as ProjectStatus }
            : p
        )
      );

    } catch (err) {
      console.error('Error in project creation and chat:', err);
      setError(err instanceof Error ? err.message : 'Failed to process request');
      setStreamingResponse("❌ Error occurred. Please try again.");
      
      // Update temporary project with error status
      setProjects(prev => 
        prev.map(p => 
          p.id === tempProject.id 
            ? { ...p, status: 'error' as ProjectStatus }
            : p
        )
      );
    } finally {
      setIsGenerating(false);
    }
    
    setPrompt("");
  };

  const getStatusColor = (status: ProjectStatus = 'completed'): string => {
    switch (status) {
      case 'creating': return 'bg-yellow-500';
      case 'generating': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: ProjectStatus = 'completed'): string => {
    switch (status) {
      case 'creating': return 'Creating';
      case 'generating': return 'Generating';
      case 'completed': return 'Ready';
      case 'error': return 'Error';
      default: return 'Unknown';
    }
  };

  return (
    <div className="h-screen flex">
      {/* Left Panel - Prompt Input */}
      <div className="w-1/2 border-r bg-gray-50/30 flex flex-col">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Create Solana App</h2>
          <p className="text-sm text-gray-600 mt-1">Describe your app and we&apos;ll generate it for you</p>
        </div>
        
        <div className="flex-1 p-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-2">
                Project Description
              </label>
              <Textarea
                id="prompt"
                placeholder="Describe the Solana application you want to create..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[200px] resize-none"
                disabled={isGenerating}
              />
            </div>
            
            <div>
              <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-2">
                Model
              </label>
              <Select
                value={selectedModel}
                onValueChange={setSelectedModel}
                disabled={isGenerating}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={AVAILABLE_MODELS.find(m => m.value === selectedModel)?.label || "Select a model"} />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_MODELS.map((model) => (
                    <SelectItem key={model.value} value={model.value}>
                      {model.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {error && (
              <div className="flex items-center space-x-2 text-red-600 text-sm">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}
            
            <Button
              onClick={handleSubmit}
              disabled={!prompt.trim() || isGenerating}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Project...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Create Project
                </>
              )}
            </Button>
          </div>
          
          <Separator className="my-6" />
          
          {/* Previous Projects */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Recent Projects</h3>
              <Button variant="ghost" size="sm" onClick={loadProjects}>
                Refresh
              </Button>
            </div>
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {projects.map((project) => (
                  <Card key={project.id} className="cursor-pointer hover:bg-gray-50 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Badge 
                          className={`${getStatusColor(project.status)} text-white text-xs`}
                        >
                          {getStatusText(project.status)}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {new Date(project.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 line-clamp-2">{project.description}</p>
                      <p className="text-xs text-gray-500 mt-1 font-mono">ID: {project.id}</p>
                    </CardContent>
                  </Card>
                ))}
                
                {projects.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500 text-sm">No projects yet. Create your first Solana app!</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>

      {/* Right Panel - Streaming Response */}
      <div className="w-1/2 flex flex-col">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Generation Output</h2>
          <p className="text-sm text-gray-600 mt-1">Real-time project creation progress</p>
        </div>
        
        <div className="flex-1 p-6">
          <Card className="h-full">
            <CardContent className="p-6 h-full">
              <ScrollArea className="h-full">
                {streamingResponse ? (
                  <pre className="whitespace-pre-wrap text-sm font-mono text-gray-800 leading-relaxed">
                    {streamingResponse}
                  </pre>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="text-gray-400 text-6xl mb-4">⚡</div>
                      <p className="text-gray-500">Start creating a project to see the generation output here</p>
                    </div>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
