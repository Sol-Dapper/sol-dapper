 "use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { ChevronDown, LogOut, Menu, Copy, Check } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { ThemeToggle } from "./theme-toggle"

interface User {
  id: string
  email?: {
    address: string
  }
  wallet?: {
    address: string
  }
}

interface NavigationProps {
  user?: User | null
  onLogout: () => void
}

export function Navigation({ user, onLogout }: NavigationProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isCopied, setIsCopied] = useState(false)

  const copyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address)
      setIsCopied(true)
      // Reset the copied state after 2 seconds
      setTimeout(() => {
        setIsCopied(false)
      }, 2000)
    } catch (err) {
      console.error('Failed to copy address:', err)
    }
  }

  const getInitials = (email?: string, walletAddress?: string): string => {
    if (email && email !== `wallet-user-${walletAddress?.substring(0, 8)}@example.com`) {
      return email.substring(0, 2).toUpperCase()
    }
    if (walletAddress) {
      return walletAddress.substring(0, 2).toUpperCase()
    }
    return "U"
  }

  const getDisplayName = (): string => {
    if (
      user?.email?.address &&
      user.email.address !== `wallet-user-${user.wallet?.address?.substring(0, 8)}@example.com`
    ) {
      return user.email.address
    }
    if (user?.wallet?.address) {
      return `${user.wallet.address.slice(0, 8)}...${user.wallet.address.slice(-4)}`
    }
    return "User"
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 w-full items-center justify-between px-12">
        {/* Logo */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center ">
            <div className="flex h-10 w-10 items-center justify-center">
              <Image 
                src="/dapperGithub.jpg" 
                alt="Sol-Dapper Logo" 
                width={40} 
                height={40} 
                className="object-cover" 
              />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Sol-Dapper</h1>
          </Link>
          
          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-4">
            {/* Demo and Builder routes removed - functionality integrated into main project page */}
          </nav>
        </div>

        {/* Desktop User Menu */}
        <div className="hidden md:flex items-center gap-2">
          <ThemeToggle />
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-12 w-auto gap-3 rounded-2xl px-4 hover:bg-muted/50"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                      {getInitials(user?.email?.address, user?.wallet?.address)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{getDisplayName()}</span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                {user?.wallet?.address && (
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault()
                      copyAddress(user.wallet!.address)
                    }}
                    className="cursor-pointer  h-7"
                  >
                    {isCopied ? (
                      <Check className="mr-3 h-1 w-4 text-green-500" />
                    ) : (
                      <Copy className="mr-3 h-4 w-4" />
                    )}
                    {isCopied ? 'Copied!' : 'Copy Address'}
                  </DropdownMenuItem>
                )}
                
                {user?.wallet?.address && <DropdownMenuSeparator />}
                
                <DropdownMenuItem
                  onClick={onLogout}
                  className="cursor-pointer text-destructive focus:text-destructive h-7"
                >
                  <LogOut className="mr-3 h-5 w-5" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Mobile Menu */}
        <div className="md:hidden flex items-center gap-2">
          <ThemeToggle />
          {user && (
            <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle className="text-left">Account</SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-6">
                  {/* Mobile Navigation Links */}
                  <div className="space-y-2">
                    {/* Demo and Builder routes removed - functionality integrated into main project page */}
                  </div>
                  
                  {/* Theme Toggle */}
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border">
                    <span className="font-medium">Theme</span>
                    <ThemeToggle />
                  </div>
                  
                  {user?.wallet?.address && (
                    <Button
                      onClick={() => copyAddress(user.wallet!.address)}
                      variant="ghost"
                      className="w-full justify-start h-12 rounded-xl"
                    >
                      {isCopied ? (
                        <Check className="mr-3 h-5 w-5 text-green-500" />
                      ) : (
                        <Copy className="mr-3 h-5 w-5" />
                      )}
                      {isCopied ? 'Copied!' : 'Copy Address'}
                    </Button>
                  )}

                  <Button
                    onClick={() => {
                      onLogout()
                      setIsMobileOpen(false)
                    }}
                    variant="ghost"
                    className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 h-12 rounded-xl"
                  >
                    <LogOut className="mr-3 h-5 w-5" />
                    Sign Out
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </div>
    </header>
  )
}