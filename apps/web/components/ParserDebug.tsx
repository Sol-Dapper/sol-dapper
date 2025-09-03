"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AIResponseParser, type ParsedResponse } from '@/lib/xml-parser'

const SIMPLE_TEST_RESPONSE = `<forgeArtifact id="solana-wallet-dapp" title="Solana Wallet Connection dApp">
  <forgeAction type="shell">
    npx create-solana-dapp@latest wallet-connect-app --template nextjs --yes
  </forgeAction>

  <forgeAction type="shell">
    cd wallet-connect-app && npm install
  </forgeAction>

  <forgeAction type="file" filePath="src/components/WalletInfo.tsx">
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useEffect, useState } from 'react';

export default function WalletInfo() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (publicKey) {
      connection.getBalance(publicKey).then((balance) => {
        setBalance(balance / LAMPORTS_PER_SOL);
      });
    }
  }, [connection, publicKey]);

  if (!publicKey) return null;

  return (
    <div className="p-4 bg-gray-100 rounded-lg">
      <h3 className="text-lg font-bold mb-2">Wallet Info</h3>
      <p className="text-sm text-gray-600 mb-1">
        Address: {publicKey.toBase58()}
      </p>
      <p className="text-sm text-gray-600">
        Balance: {balance !== null ? \`\${balance.toFixed(4)} SOL\` : 'Loading...'}
      </p>
    </div>
  );
}
  </forgeAction>
</forgeArtifact>`

export function ParserDebug() {
  const [result, setResult] = useState<ParsedResponse | null>(null)
  
  const testParser = () => {
    const parser = new AIResponseParser()
    const parsed = parser.parseResponse(SIMPLE_TEST_RESPONSE)
    setResult(parsed)
    console.log('Parsed result:', parsed)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Parser Debug</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={testParser}>Test Parser</Button>
        
        {result && (
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold">Files ({result.files?.length || 0}):</h4>
              <pre className="text-sm bg-muted p-2 rounded">
                {JSON.stringify(result.files, null, 2)}
              </pre>
            </div>
            
            <div>
              <h4 className="font-semibold">Code Blocks ({result.codeBlocks?.length || 0}):</h4>
              <pre className="text-sm bg-muted p-2 rounded">
                {JSON.stringify(result.codeBlocks, null, 2)}
              </pre>
            </div>
            
            <div>
              <h4 className="font-semibold">Artifact:</h4>
              <pre className="text-sm bg-muted p-2 rounded">
                {JSON.stringify(result.artifact, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 