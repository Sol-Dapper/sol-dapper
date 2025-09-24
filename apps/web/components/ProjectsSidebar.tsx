"use client"

import { useState, useRef, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import {
  History,
  RefreshCw,
  CheckCircle,
  XCircle,
  PanelLeft,
  Plus,
  Clock,
  Sparkles,
  FolderOpen,
  ArrowRight,
  ChevronRight,
} from "lucide-react"
import Link from "next/link"
import { InlineLoader } from "@/components/ui/loading-spinner"

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

export function ProjectsSidebar({
  projects,
  isLoadingProjects,
  onLoadProjects,
  topOffset = 0,
}: ProjectsSidebarProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Memoize project list to prevent scroll position reset on hover state changes
  const memoizedProjects = useMemo(() => projects, [projects])

  const getStatusIcon = (status: ProjectStatus = "completed") => {
    switch (status) {
      case "creating":
        return <InlineLoader size="sm" className="text-amber-500" />
      case "generating":
        return <InlineLoader size="sm" className="text-blue-500" />
      case "completed":
        return <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
      case "error":
        return <XCircle className="h-3.5 w-3.5 text-rose-500" />
      default:
        return <CheckCircle className="h-3.5 w-3.5 text-muted-foreground" />
    }
  }

  const getStatusBadge = (status: ProjectStatus = "completed") => {
    const statusConfig = {
      creating: { 
        label: "Creating", 
        class: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" 
      },
      generating: { 
        label: "Generating", 
        class: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" 
      },
      completed: { 
        label: "Ready", 
        class: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" 
      },
      error: { 
        label: "Error", 
        class: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20" 
      },
    }

    const config = statusConfig[status] || statusConfig.completed

    return status !== "completed" ? (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${config.class}`}>
        {getStatusIcon(status)}
        {config.label}
      </span>
    ) : null
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 24) {
      if (diffInHours < 1) {
        return "Just now"
      }
      const hours = Math.floor(diffInHours)
      return `${hours}h ago`
    } else if (diffInHours < 168) { // 7 days
      const days = Math.floor(diffInHours / 24)
      return `${days}d ago`
    }
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    })
  }

  const SidebarContent = () => (
    <div className="h-full flex flex-col bg-gradient-to-b from-background to-background/95">
      {/* Header Section with Gradient */}
      <div className="relative p-6 pb-4">
        {/* Decorative gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
        
        <div className="relative">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl" />
                <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 shadow-sm">
                  <History className="h-5 w-5 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-base tracking-tight">Recent Projects</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {memoizedProjects.length} {memoizedProjects.length === 1 ? 'project' : 'projects'}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onLoadProjects}
              disabled={isLoadingProjects}
              className="h-8 w-8 p-0 rounded-lg hover:bg-primary/10 transition-all duration-200"
            >
              <RefreshCw
                className={`h-4 w-4 transition-all duration-500 ${
                  isLoadingProjects ? "animate-spin text-primary" : "hover:rotate-180"
                }`}
              />
            </Button>
          </div>

          {/* New Project Button with enhanced styling */}
          <Link href="/">
            <Button 
              className="w-full group relative overflow-hidden rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-300 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5"
              size="sm"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              <Plus className="mr-2 h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
              <span className="font-medium">New Project</span>
              <Sparkles className="ml-auto h-3.5 w-3.5 opacity-70" />
            </Button>
          </Link>
        </div>
      </div>

      <Separator className="opacity-50" />

      {/* Projects List */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ScrollArea 
          ref={scrollAreaRef} 
          className="h-full" 
          style={{ 
            scrollBehavior: 'auto',
            scrollbarGutter: 'stable'
          }}
        >
          <div className="p-3 space-y-1.5">
            {isLoadingProjects ? (
              <div className="space-y-2 px-1">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="h-14 rounded-xl bg-gradient-to-r from-muted/30 to-muted/20 animate-pulse"
                  />
                ))}
              </div>
            ) : (
              <>
                {memoizedProjects.map((project, index) => (
                  <Link
                    key={project.id}
                    href={`/p/${project.id}`}
                    className="group relative block"
                  >
                    <div className="
                      relative flex flex-col gap-1.5 rounded-xl px-3.5 py-3 
                      bg-gradient-to-r from-transparent to-transparent
                      group-hover:from-primary/5 group-hover:to-transparent
                      border border-transparent group-hover:border-primary/10
                      transition-all duration-300 ease-out will-change-transform
                      group-hover:translate-x-1
                    ">
                      {/* Project Content */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span 
                              className="font-medium text-sm text-foreground/90 truncate block max-w-[200px]" 
                              title={project.description}
                            >
                              {project.description}
                            </span>
                            {getStatusBadge(project.status)}
                          </div>
                        </div>
                        
                        {/* Arrow indicator on hover */}
                        <ChevronRight className="
                          h-4 w-4 text-muted-foreground/50 transition-all duration-300 flex-shrink-0 mt-0.5
                          opacity-0 group-hover:opacity-100 group-hover:translate-x-1
                        " />
                      </div>
                      
                      {/* Date and additional info */}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{formatDate(project.createdAt)}</span>
                      </div>

                      {/* Hover effect line */}
                      <div className="
                        absolute left-0 top-1/2 -translate-y-1/2 h-8 w-0.5 bg-gradient-to-b from-transparent via-primary to-transparent 
                        transition-all duration-300 opacity-0 group-hover:opacity-100
                      " />
                    </div>
                  </Link>
                ))}

                {memoizedProjects.length === 0 && !isLoadingProjects && (
                  <div className="py-12 text-center">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted/50 mb-3">
                      <FolderOpen className="h-6 w-6 text-muted-foreground/50" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">No projects yet</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      Create your first project to get started
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Footer with gradient fade */}
      <div className="relative">
        <div className="absolute bottom-full h-8 w-full bg-gradient-to-t from-background to-transparent pointer-events-none" />
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop Hover Trigger and Sidebar */}
      <div className="hidden lg:block">
        {/* Hover trigger area with visual indicator */}
        <div
          className="fixed left-0 w-12 z-50 group"
          style={{
            top: topOffset,
            height: `calc(100vh - ${topOffset}px)`,
          }}
          onMouseEnter={() => setIsHovered(true)}
        >
          {/* Visual indicator line */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-24 w-0.5 bg-gradient-to-b from-transparent via-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        </div>

        {/* Sidebar with enhanced animations */}
        <div
          className={`
            fixed left-0 w-80 
            bg-background/98 backdrop-blur-xl supports-[backdrop-filter]:bg-background/95 
            border-r shadow-2xl shadow-black/5
            z-40 transition-all duration-400 ease-out
            ${isHovered ? 'translate-x-0' : '-translate-x-full'}
          `}
          style={{ top: topOffset, height: `calc(100vh - ${topOffset}px)` }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <SidebarContent />
        </div>

        {/* Enhanced background overlay */}
        {isHovered && (
          <div
            className="fixed inset-0 bg-black/5 backdrop-blur-[2px] z-30 transition-all duration-500"
            style={{ top: topOffset }}
            onClick={() => setIsHovered(false)}
          />
        )}
      </div>

      {/* Mobile Sidebar with floating button */}
      <div className="lg:hidden">
        <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="fixed left-4 top-20 z-40 h-11 w-11 rounded-full bg-background/95 backdrop-blur-xl border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              <PanelLeft className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 p-0 border-r-0">
            <div className="h-full">
              <SidebarContent />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
}