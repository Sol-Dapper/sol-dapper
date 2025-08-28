"use client";

import { usePrivy } from "@privy-io/react-auth";
import { PromptInterface } from "../components/PromptInterface";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { JSX, useEffect, useState, useCallback } from "react";
import { registerUser } from "../lib/api";

export default function Home(): JSX.Element {
  const { login, authenticated, user, logout, ready } = usePrivy();
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationError, setRegistrationError] = useState<string | null>(null);

  // Handle user registration explicitly
  const handleRegistration = useCallback(async () => {
    if (!user?.id) return;
    
    console.log('Starting explicit user registration for:', user.id);
    setIsRegistering(true);
    setRegistrationError(null);
    
    try {
      const userData = {
        privyUserId: user.id,
        email: user.email?.address || '',
        walletAddress: user.wallet?.address || undefined
      };
      
      console.log('Registration data:', userData);
      
      // If no email, use a placeholder to ensure user creation
      if (!userData.email && userData.walletAddress) {
        userData.email = `wallet-user-${userData.walletAddress.substring(0, 8)}@example.com`;
      }
      
      const result = await registerUser(userData);
      console.log('Registration successful:', result);
    } catch (error) {
      console.error('Registration failed:', error);
      setRegistrationError(error instanceof Error ? error.message : 'Registration failed');
    } finally {
      setIsRegistering(false);
    }
  }, [user]);

  // Register when user becomes available
  useEffect(() => {
    if (ready && authenticated && user?.id) {
      handleRegistration();
    }
  }, [ready, authenticated, user, handleRegistration]);

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

  // Show loading during registration
  if (isRegistering) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="text-6xl mb-6">⚡</div>
            <h1 className="text-3xl font-bold mb-4 text-gray-900">Sol-Dapper</h1>
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <p className="text-gray-600">Setting up your account...</p>
            </div>
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
