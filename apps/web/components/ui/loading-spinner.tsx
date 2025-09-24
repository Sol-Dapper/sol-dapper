"use client"

import { cn } from "@/lib/utils"
import Image from "next/image"

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl"
  variant?: "default" | "minimal" | "branded"
  text?: string
  className?: string
  showIcon?: boolean
}

const sizeClasses = {
  sm: "w-4 h-4",
  md: "w-6 h-6", 
  lg: "w-8 h-8",
  xl: "w-12 h-12"
}

const textSizeClasses = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg", 
  xl: "text-xl"
}

export function LoadingSpinner({ 
  size = "md", 
  variant = "default",
  text,
  className,
  showIcon = false
}: LoadingSpinnerProps) {
  if (variant === "minimal") {
    return (
      <div className={cn("flex items-center justify-center", className)}>
        <div 
          className={cn(
            "rounded-full border-2 border-muted-foreground/20 border-t-primary animate-spin",
            sizeClasses[size]
          )}
        />
        {text && (
          <span className={cn("ml-2 text-muted-foreground", textSizeClasses[size])}>
            {text}
          </span>
        )}
      </div>
    )
  }

  if (variant === "branded") {
    return (
      <div className={cn("flex flex-col items-center justify-center gap-4", className)}>
        <div className="relative">
          <div 
            className={cn(
              "rounded-full border-2 border-primary/20 border-t-primary animate-spin",
              sizeClasses[size]
            )}
          />
          {showIcon && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className={cn("",
                size === "sm" ? "h-2 w-2" :
                size === "md" ? "h-3 w-3" : 
                size === "lg" ? "h-4 w-4" : "h-6 w-6"
              )}>
                <Image 
                  src="/dapperGithub.jpg" 
                  alt="Sol-Dapper" 
                  width={size === "sm" ? 8 : size === "md" ? 12 : size === "lg" ? 16 : 24}
                  height={size === "sm" ? 8 : size === "md" ? 12 : size === "lg" ? 16 : 24}
                  className="object-cover" 
                />
              </div>
            </div>
          )}
        </div>
        {text && (
          <div className="space-y-1 text-center">
            <p className={cn("font-medium text-foreground", textSizeClasses[size])}>
              {text}
            </p>
            <p className="text-muted-foreground text-sm">Please wait</p>
          </div>
        )}
      </div>
    )
  }

  // Default variant
  return (
    <div className={cn("flex items-center justify-center", className)}>
      <div 
        className={cn(
          "rounded-full border-2 border-primary/20 border-t-primary animate-spin",
          sizeClasses[size]
        )}
      />
      {text && (
        <span className={cn("ml-2 text-muted-foreground", textSizeClasses[size])}>
          {text}
        </span>
      )}
    </div>
  )
}

// Pre-configured loading states for common use cases
export function PageLoader({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="w-full max-w-lg mx-auto text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 mb-8">
          <Image 
            src="/dapperGithub.jpg" 
            alt="Sol-Dapper Logo" 
            width={80} 
            height={80} 
            className="object-cover" 
          />
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-3">Sol-Dapper</h1>
        <p className="text-muted-foreground mb-12 text-lg leading-relaxed">
          {text}
        </p>
        
        <div className="p-10 border border-border/50 shadow-lg bg-card/50 backdrop-blur-sm rounded-xl">
          <LoadingSpinner 
            variant="branded" 
            size="xl" 
            text="Loading..." 
            className="w-full"
          />
        </div>
      </div>
    </div>
  )
}

// Inline loader for buttons and smaller components
export function InlineLoader({ 
  size = "sm", 
  text,
  className 
}: { 
  size?: "sm" | "md"
  text?: string
  className?: string 
}) {
  return (
    <LoadingSpinner 
      variant="minimal" 
      size={size} 
      text={text}
      className={className}
    />
  )
} 