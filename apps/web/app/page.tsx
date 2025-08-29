"use client"

import { usePrivy } from "@privy-io/react-auth"
import { PromptInterface } from "components/PromptInterface"
import { Button } from "../components/ui/button"
import { Card } from "../components/ui/card"
import { Navigation } from "../components/navigation"
import { type JSX, useEffect, useState, useCallback } from "react"
import { registerUser } from "../lib/api"
import { Zap, Wallet, Mail, Shield } from "lucide-react"

export default function Home(): JSX.Element {
  const { login, authenticated, user, logout, ready } = usePrivy()
  const [isRegistering, setIsRegistering] = useState(false)
  const [registrationError, setRegistrationError] = useState<string | null>(null)

  const handleRegistration = useCallback(async () => {
    if (!user?.id) return
    setIsRegistering(true)
    setRegistrationError(null)
    try {
      const userData = {
        privyUserId: user.id,
        email: user.email?.address || "",
        walletAddress: user.wallet?.address || undefined,
      }
      if (!userData.email && userData.walletAddress) {
        userData.email = `wallet-user-${userData.walletAddress.substring(0, 8)}@example.com`
      }
      await registerUser(userData)
    } catch (error) {
      setRegistrationError(error instanceof Error ? error.message : "Registration failed")
    } finally {
      setIsRegistering(false)
    }
  }, [user])

  useEffect(() => {
    if (ready && authenticated && user?.id) {
      handleRegistration()
    }
  }, [ready, authenticated, user, handleRegistration])

  if (!authenticated || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="w-full max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-primary/5 border border-primary/10 mb-8">
              <Zap className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-4xl font-bold text-foreground mb-4">Sol-Dapper</h1>
            <p className="text-xl text-muted-foreground mb-12 max-w-lg mx-auto leading-relaxed">
              Build powerful Solana applications with AI assistance in minutes
            </p>
          </div>

          <Card className="p-10 border border-border/50 shadow-lg bg-card/50 backdrop-blur-sm">
            <div className="space-y-8">
              <div className="text-center">
                <h2 className="text-2xl font-semibold text-foreground mb-3">Get Started</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Connect your wallet or sign in with email to begin creating innovative Solana applications
                </p>
              </div>

              <div className="grid gap-4">
                <div className="flex items-center gap-4 p-5 rounded-2xl bg-muted/20 border border-border/30 hover:bg-muted/30 transition-colors">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
                    <Wallet className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-foreground mb-1">Wallet Connection</p>
                    <p className="text-sm text-muted-foreground">Secure crypto wallet integration with multiple providers</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-5 rounded-2xl bg-muted/20 border border-border/30 hover:bg-muted/30 transition-colors">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
                    <Zap className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-foreground mb-1">AI-Powered Generation</p>
                    <p className="text-sm text-muted-foreground">Advanced AI models for intelligent code creation</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-5 rounded-2xl bg-muted/20 border border-border/30 hover:bg-muted/30 transition-colors">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
                    <Shield className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-foreground mb-1">Secure & Private</p>
                    <p className="text-sm text-muted-foreground">Your data stays protected with enterprise security</p>
                  </div>
                </div>
              </div>

              <Button onClick={login} className="w-full h-14 text-lg font-medium bg-primary hover:bg-primary/90 border-0">
                Connect & Continue
              </Button>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  if (isRegistering) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="w-full max-w-lg mx-auto text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-primary/5 border border-primary/10 mb-8">
            <Zap className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-3">Setting Up Your Account</h1>
          <p className="text-muted-foreground mb-12 text-lg leading-relaxed">
            We're preparing your personalized workspace...
          </p>
          
          <Card className="p-10 border border-border/50 shadow-lg bg-card/50 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-6">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
              </div>
              <div className="space-y-3 text-center">
                <p className="font-medium text-foreground text-lg">Initializing workspace...</p>
                <p className="text-muted-foreground">This will only take a moment</p>
              </div>
              {registrationError && (
                <div className="w-full p-4 rounded-xl bg-destructive/10 border border-destructive/20">
                  <p className="font-medium text-destructive mb-1">Setup Error</p>
                  <p className="text-sm text-destructive/80">{registrationError}</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation user={user} onLogout={logout} />
      <main className="flex-1 bg-background">
        <PromptInterface />
      </main>
    </div>
  )
}
