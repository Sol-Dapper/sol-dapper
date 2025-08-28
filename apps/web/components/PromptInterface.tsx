"use client";

import { useState, useEffect, JSX } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Separator } from "./ui/separator";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
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

export function PromptInterface(): JSX.Element {
  const { getAccessToken } = usePrivy();
  const [prompt, setPrompt] = useState<string>("");
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

      // Start streaming response simulation
      setStreamingResponse("🚀 Starting project creation...\n\n");
      
      const response = await fetch('http://localhost:3001/project', {
        method: 'POST',
        headers: {
          'Authorization': token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.message || response.statusText;
        throw new Error(`Failed to create project: ${errorMessage}`);
      }

      const result = await response.json();
      
      // Update streaming response
      setStreamingResponse(prev => prev + "✅ Project created successfully!\n\n");
      setStreamingResponse(prev => prev + `📝 Project ID: ${result.project}\n`);
      setStreamingResponse(prev => prev + `📋 Description: ${prompt.split('\n')[0]}\n\n`);
      setStreamingResponse(prev => prev + "🔄 Analyzing requirements...\n");
      setStreamingResponse(prev => prev + "🏗️  Setting up Solana project structure...\n");
      setStreamingResponse(prev => prev + "⚡ Ready for development!\n");

      // Update the temporary project with success status
      setProjects(prev => 
        prev.map(p => 
          p.id === tempProject.id 
            ? { 
                ...p, 
                id: result.project,
                status: 'completed' as ProjectStatus
              }
            : p
        )
      );

    } catch (err) {
      console.error('Error creating project:', err);
      setError(err instanceof Error ? err.message : 'Failed to create project');
      setStreamingResponse("❌ Error creating project. Please try again.");
      
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
          <p className="text-sm text-gray-600 mt-1">Describe your app and we'll generate it for you</p>
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
