"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { History, RefreshCw, ExternalLink, Clock, CheckCircle, XCircle, Loader2, PanelLeft } from "lucide-react"
import Link from "next/link"

type ProjectStatus = "creating" | "generating" | "completed" | "error"

interface Project {
  id: string
  description: string
  userId: string
  createdAt: string
  updatedAt: string
}

interface ProjectWithStatus extends Project {
  status?: ProjectStatus
}

interface ProjectsSidebarProps {
  projects: ProjectWithStatus[]
  isLoadingProjects: boolean
  onLoadProjects: () => void
  topOffset?: number
}

export function ProjectsSidebar({ projects, isLoadingProjects, onLoadProjects, topOffset = 0 }: ProjectsSidebarProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const getStatusIcon = (status: ProjectStatus = "completed") => {
    switch (status) {
      case "creating":
        return <Loader2 className="h-3 w-3 animate-spin text-amber-500" />
      case "generating":
        return <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
      case "completed":
        return <CheckCircle className="h-3 w-3 text-green-500" />
      case "error":
        return <XCircle className="h-3 w-3 text-red-500" />
      default:
        return <CheckCircle className="h-3 w-3 text-muted-foreground" />
    }
  }

  const getStatusColor = (status: ProjectStatus = "completed"): string => {
    switch (status) {
      case "creating":
        return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300"
      case "generating":
        return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300"
      case "completed":
        return "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300"
      case "error":
        return "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
      default:
        return "border-border bg-muted text-muted-foreground"
    }
  }

  const getStatusText = (status: ProjectStatus = "completed"): string => {
    switch (status) {
      case "creating":
        return "Creating"
      case "generating":
        return "Generating"
      case "completed":
        return "Ready"
      case "error":
        return "Failed"
      default:
        return "Unknown"
    }
  }

  const SidebarContent = () => (
    <div className="h-full flex flex-col">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
              <History className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Recent Projects</h3>
              <p className="text-sm text-muted-foreground">Your project history</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onLoadProjects}
            disabled={isLoadingProjects}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={`h-4 w-4 ${isLoadingProjects ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        
        {/* New Project Button */}
        <Link href="/">
          <Button className="w-full mb-4" size="sm">
            <span className="mr-2 text-lg">+</span>
            New Project
          </Button>
        </Link>
      </div>
      
      <Separator />
      
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-3">
          {isLoadingProjects ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Card key={i} className="border-border/30">
                  <CardContent className="p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <Skeleton className="h-5 w-14" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <Skeleton className="h-3 w-full mb-2" />
                    <Skeleton className="h-3 w-2/3 mb-3" />
                    <Skeleton className="h-5 w-24" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <>
              {projects.map((project) => (
                <Link key={project.id} href={`/p/${project.id}`}>
                  <Card className="group cursor-pointer transition-all hover:bg-muted/30 hover:border-primary/20 border-border/30 hover:shadow-sm">
                    <CardContent className="p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <Badge 
                          variant="outline"
                          className={`${getStatusColor(project.status)} border text-xs font-medium px-2 py-1`}
                        >
                          <div className="flex items-center gap-1.5">
                            {getStatusIcon(project.status)}
                            {getStatusText(project.status)}
                          </div>
                        </Badge>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                          <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                      <p className="line-clamp-2 text-sm text-foreground mb-2 leading-relaxed">
                        {project.description}
                      </p>
                      <Badge variant="secondary" className="font-mono text-xs">
                        {project.id}
                      </Badge>
                    </CardContent>
                  </Card>
                </Link>
              ))}

              {projects.length === 0 && !isLoadingProjects && (
                <div className="py-12 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted/30 border border-border/30 mx-auto mb-4">
                    <History className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="font-medium text-foreground mb-1">No projects yet</p>
                  <p className="text-sm text-muted-foreground">
                    Create your first project to see it here
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  )

  return (
    <>
      {/* Desktop Hover Trigger and Sidebar */}
      <div className="hidden lg:block">
        {/* Hover trigger area - invisible area on the left side */}
        <div
          className="fixed left-0 w-16 z-50 bg-transparent"
          style={{ 
            top: topOffset, 
            height: `calc(100vh - ${topOffset}px)` 
          }}
          onMouseEnter={() => setIsHovered(true)}
        />
        
        {/* Sidebar */}
        <div
          className={`fixed left-0 w-80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-r z-40 transition-transform duration-300 ease-in-out ${
            isHovered ? 'translate-x-0' : '-translate-x-full'
          }`}
          style={{ top: topOffset, height: `calc(100vh - ${topOffset}px)` }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <SidebarContent />
        </div>
        
        {/* Background overlay when sidebar is visible */}
        {isHovered && (
          <div 
            className="fixed inset-0 bg-black/10 backdrop-blur-sm z-30 transition-opacity duration-300"
            style={{ top: topOffset }}
            onClick={() => setIsHovered(false)}
          />
        )}
      </div>

      {/* Mobile Sidebar */}
      <div className="lg:hidden">
        <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="fixed left-4 top-20 z-40 h-10 w-10 rounded-full bg-background/80 backdrop-blur border border-border/50 shadow-sm lg:hidden"
            >
              <PanelLeft className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 p-0">
            <SheetHeader className="p-6 pb-0">
              <SheetTitle className="text-left">Projects</SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              <SidebarContent />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
}
