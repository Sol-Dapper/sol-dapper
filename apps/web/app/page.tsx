"use client";

import { usePrivy } from "@privy-io/react-auth";
import { PromptInterface } from "../components/PromptInterface";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { JSX } from "react";

export default function Home(): JSX.Element {
  const { login, authenticated, user, logout } = usePrivy();

  if (!authenticated || !user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="text-6xl mb-6">⚡</div>
            <h1 className="text-3xl font-bold mb-4 text-gray-900">Sol-Dapper</h1>
            <p className="text-gray-600 mb-6">
              Create Solana applications with AI. Connect your wallet to get started.
            </p>
            <Button onClick={login} className="w-full" size="lg">
              Connect Wallet & Continue
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <div className="h-screen bg-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">⚡</div>
            <h1 className="text-xl font-bold text-gray-900">Sol-Dapper</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              {user.wallet?.address ? (
                <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                  {user.wallet.address.slice(0, 8)}...{user.wallet.address.slice(-8)}
                </span>
              ) : (
                user.email?.address || 'Connected'
              )}
            </div>
            <Button variant="outline" size="sm" onClick={logout}>
              Disconnect
            </Button>
          </div>
        </div>
      </header>

      {/* Main Interface */}
      <PromptInterface />
    </div>
  );
}
