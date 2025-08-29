 "use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { ChevronDown, LogOut, Wallet, Mail, Shield, Zap, Menu } from "lucide-react"

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
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
            <Zap className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Sol-Dapper</h1>
        </div>

        {/* Desktop User Menu */}
        <div className="hidden md:flex">
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
              <DropdownMenuContent className="w-80" align="end" forceMount>
                <DropdownMenuLabel className="p-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary text-primary-foreground text-base font-semibold">
                        {getInitials(user?.email?.address, user?.wallet?.address)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                      <p className="font-semibold text-lg">{getDisplayName()}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {user?.wallet?.address ? (
                          <>
                            <Wallet className="h-4 w-4" />
                            <span>Wallet Connected</span>
                          </>
                        ) : (
                          <>
                            <Mail className="h-4 w-4" />
                            <span>Email User</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </DropdownMenuLabel>
                
                {user?.wallet?.address && (
                  <>
                    <DropdownMenuSeparator />
                    <div className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium text-muted-foreground">Wallet Address</p>
                      </div>
                      <div className="font-mono text-sm text-foreground break-all bg-muted/30 rounded-xl p-3 border">
                        {user.wallet.address}
                      </div>
                    </div>
                  </>
                )}
                
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={onLogout}
                  className="cursor-pointer text-destructive focus:text-destructive m-1 rounded-xl h-11"
                >
                  <LogOut className="mr-3 h-5 w-5" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Mobile Menu */}
        <div className="md:hidden">
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
                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-muted/30 border">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                        {getInitials(user?.email?.address, user?.wallet?.address)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                      <p className="font-semibold">{getDisplayName()}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {user?.wallet?.address ? (
                          <>
                            <Wallet className="h-4 w-4" />
                            <span>Wallet Connected</span>
                          </>
                        ) : (
                          <>
                            <Mail className="h-4 w-4" />
                            <span>Email User</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {user?.wallet?.address && (
                    <div className="rounded-2xl border bg-muted/20 p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium text-muted-foreground">Wallet Address</p>
                      </div>
                      <div className="font-mono text-sm text-foreground break-all bg-background/50 rounded-xl p-3 border">
                        {user.wallet.address}
                      </div>
                    </div>
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