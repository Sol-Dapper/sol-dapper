"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import {
  History,
  RefreshCw,
  CheckCircle,
  XCircle,
  Loader2,
  PanelLeft,
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

  const getStatusIcon = (status: ProjectStatus = "completed") => {
    switch (status) {
      case "creating":
        return <InlineLoader size="sm" className="text-amber-500" />
      case "generating":
        return <InlineLoader size="sm" className="text-blue-500" />
      case "completed":
        return <CheckCircle className="h-3 w-3 text-green-500" />
      case "error":
        return <XCircle className="h-3 w-3 text-red-500" />
      default:
        return <CheckCircle className="h-3 w-3 text-muted-foreground" />
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
            <RefreshCw
              className={`h-4 w-4 ${isLoadingProjects ? "animate-spin" : ""}`}
            />
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

      <div className="flex-1 min-h-0 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-2 space-y-1">
            {isLoadingProjects ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="h-10 rounded-md bg-muted/30 animate-pulse"
                  />
                ))}
              </div>
            ) : (
              <>
                {projects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/p/${project.id}`}
                    className="flex items-center rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted/40 transition block"
                  >
                    {/* Left side: status + description */}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {/* {getStatusIcon(project.status)} */}
                      <span 
                        className="block overflow-hidden" 
                        style={{ 
                          textOverflow: 'ellipsis', 
                          whiteSpace: 'nowrap',
                          direction: 'rtl',
                          textAlign: 'left'
                        }}
                        title={project.description}
                      >
                        {project.description}
                      </span>
                    </div>

                    {/* Right side: date */}
                    <div className="ml-2 flex-shrink-0 text-xs text-muted-foreground">
                      {new Date(project.createdAt).toLocaleDateString()}
                    </div>
                  </Link>
                ))}

                {projects.length === 0 && !isLoadingProjects && (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    No projects yet
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop Hover Trigger and Sidebar */}
      <div className="hidden lg:block">
        {/* Hover trigger area */}
        <div
          className="fixed left-0 w-16 z-50 bg-transparent"
          style={{
            top: topOffset,
            height: `calc(100vh - ${topOffset}px)`,
          }}
          onMouseEnter={() => setIsHovered(true)}
        />

        {/* Sidebar */}
        <div
          className={`fixed left-0 w-80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-r z-40 transition-transform duration-300 ease-in-out ${
            isHovered ? "translate-x-0" : "-translate-x-full"
          }`}
          style={{ top: topOffset, height: `calc(100vh - ${topOffset}px)` }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <SidebarContent />
        </div>

        {/* Background overlay */}
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