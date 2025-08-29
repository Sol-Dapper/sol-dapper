"use client"

import { usePrivy } from "@privy-io/react-auth"
import { PromptInterface } from "../components/PromptInterface"
import { Button } from "../components/ui/button"
import { Card, CardContent } from "../components/ui/card"
import { type JSX, useEffect, useState, useCallback } from "react"
import { registerUser } from "../lib/api"

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
      <main className="flex min-h-screen flex-col items-center justify-center p-6 md:p-24 bg-background">
        <Card className="w-full max-w-md rounded-lg">
          <CardContent className="p-8 text-center">
            <div className="text-6xl mb-6">⚡</div>
            <h1 className="text-3xl font-bold mb-2">Sol-Dapper</h1>
            <p className="text-muted-foreground mb-6">
              Create Solana applications with AI. Connect your wallet to get started.
            </p>
            <Button onClick={login} className="w-full" size="lg">
              Connect Wallet & Continue
            </Button>
          </CardContent>
        </Card>
      </main>
    )
  }

  if (isRegistering) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6 md:p-24 bg-background">
        <Card className="w-full max-w-md rounded-lg">
          <CardContent className="p-8 text-center">
            <div className="text-6xl mb-6">⚡</div>
            <h1 className="text-3xl font-bold mb-4">Sol-Dapper</h1>
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2"></div>
              <p className="text-muted-foreground">Setting up your account...</p>
            </div>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 md:px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="text-2xl">⚡</div>
            <h1 className="text-xl font-bold">Sol-Dapper</h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              {user.wallet?.address ? (
                <span className="font-mono bg-accent px-2 py-1 rounded">
                  {user.wallet.address.slice(0, 8)}...{user.wallet.address.slice(-8)}
                </span>
              ) : (
                user.email?.address || "Connected"
              )}
            </div>
            <Button variant="outline" size="sm" onClick={logout}>
              Disconnect
            </Button>
          </div>
        </div>
      </header>

      {/* Main Interface (v0-style: left prompt, right output + history) */}
      <PromptInterface />
    </div>
  )
}
