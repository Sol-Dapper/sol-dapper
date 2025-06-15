"use client";

import { usePrivy } from "@privy-io/react-auth";

export default function Home() {
  const { login, authenticated, user, logout } = usePrivy();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-8">Welcome to Sol-Dapper</h1>
      {authenticated && user ? (
        <div>
          <p className="text-lg mb-4">You are logged in!</p>
          <p className="text-sm bg-gray-100 p-2 rounded">User ID: {user.id}</p>
          {user.wallet && <p className="text-sm bg-gray-100 p-2 rounded mt-2">Wallet Address: {user.wallet.address}</p>}
          <button
            onClick={logout}
            className="mt-4 bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
          >
            Log Out
          </button>
        </div>
      ) : (
        <button
          onClick={login}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Log In with Privy
        </button>
      )}
    </main>
  );
}
