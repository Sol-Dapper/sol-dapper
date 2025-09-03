"use client"

import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Builder } from '@/components/Builder'
import { Step } from '@/lib/steps'

const sampleForgeXml = String.raw`I'll create a Solana counter dApp that allows users to increment, decrement, and reset a counter stored on-chain.

<forgeArtifact id="solana-counter-dapp" title="Solana Counter dApp">
<forgeAction type="file" filePath="anchor/programs/counter/Cargo.toml">
[package]
name = "counter"
version = "0.1.0"
description = "Created with Anchor"
edition = "2021"

[lib]
crate-type = ["cdylib", "lib"]
name = "counter"

[features]
no-entrypoint = []
no-idl = []
no-log-ix-name = []
cpi = ["no-entrypoint"]
default = []

[dependencies]
anchor-lang = "0.30.1"
</forgeAction>

<forgeAction type="file" filePath="anchor/programs/counter/src/lib.rs">
use anchor_lang::prelude::*;

declare_id!("11111111111111111111111111111113");

#[program]
pub mod counter {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let counter = &mut ctx.accounts.counter;
        counter.count = 0;
        counter.authority = ctx.accounts.authority.key();
        msg!("Counter initialized with count: {}", counter.count);
        Ok(())
    }

    pub fn increment(ctx: Context<Update>) -> Result<()> {
        let counter = &mut ctx.accounts.counter;
        counter.count += 1;
        msg!("Counter incremented to: {}", counter.count);
        Ok(())
    }

    pub fn decrement(ctx: Context<Update>) -> Result<()> {
        let counter = &mut ctx.accounts.counter;
        counter.count = counter.count.checked_sub(1).unwrap_or(0);
        msg!("Counter decremented to: {}", counter.count);
        Ok(())
    }

    pub fn reset(ctx: Context<Update>) -> Result<()> {
        let counter = &mut ctx.accounts.counter;
        counter.count = 0;
        msg!("Counter reset to: {}", counter.count);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 8 + 32, // discriminator + count + authority
    )]
    pub counter: Account<'info, Counter>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Update<'info> {
    #[account(
        mut,
        has_one = authority,
    )]
    pub counter: Account<'info, Counter>,
    pub authority: Signer<'info>,
}

#[account]
pub struct Counter {
    pub count: i64,
    pub authority: Pubkey,
}
</forgeAction>

<forgeAction type="file" filePath="anchor/Anchor.toml">
[features]
seeds = false
skip-lint = false

[programs.localnet]
counter = "11111111111111111111111111111113"

[registry]
url = "https://api.apr.dev"

[provider]
cluster = "Localnet"
wallet = "~/.config/solana/id.json"

[scripts]
test = "pnpm exec tsx anchor/tests/counter.test.ts"
</forgeAction>

<forgeAction type="file" filePath="src/app/counter/page.tsx">
"use client";

import { useState } from "react";
import { useCounterProgram } from "@/hooks/useCounterProgram";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CirclePlus, CircleMinus, RotateCcw, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function CounterPage() {
  const { count, loading, initialize, increment, decrement, reset } = useCounterProgram();
  const [initLoading, setInitLoading] = useState(false);

  const handleInitialize = async () => {
    try {
      setInitLoading(true);
      await initialize();
      toast.success("Counter initialized!");
    } catch (error: any) {
      console.error("Error initializing counter:", error);
      toast.error("Error initializing counter: " + error.message);
    } finally {
      setInitLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-md mx-auto">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">Solana Counter</CardTitle>
            <CardDescription>
              A simple counter program on the Solana blockchain
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <div className="text-7xl font-bold mb-8">{loading ? "..." : count !== null ? count : "?"}</div>
            {count === null ? (
              <Button 
                onClick={handleInitialize} 
                className="w-full" 
                disabled={initLoading}
              >
                {initLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Initialize Counter
              </Button>
            ) : (
              <div className="flex space-x-4">
                <Button 
                  onClick={decrement} 
                  variant="outline" 
                  size="lg"
                  disabled={loading}
                >
                  <CircleMinus className="h-6 w-6" />
                </Button>
                <Button 
                  onClick={reset} 
                  variant="outline" 
                  size="lg"
                  disabled={loading}
                >
                  <RotateCcw className="h-6 w-6" />
                </Button>
                <Button 
                  onClick={increment} 
                  variant="outline" 
                  size="lg"
                  disabled={loading}
                >
                  <CirclePlus className="h-6 w-6" />
                </Button>
              </div>
            )}
          </CardContent>
          <CardFooter className="text-center text-sm text-muted-foreground">
            {loading && <div className="flex items-center justify-center w-full"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing transaction...</div>}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
</forgeAction>

<forgeAction type="file" filePath="src/hooks/useCounterProgram.ts">
"use client";

import { useEffect, useState } from "react";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { AnchorProvider, Program, web3, BN } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { toast } from "sonner";
import { useCluster } from "@/components/cluster/cluster-data-access";

// This would normally be generated from your IDL
const IDL = {
  "version": "0.1.0",
  "name": "counter",
  "instructions": [
    {
      "name": "initialize",
      "accounts": [
        {
          "name": "counter",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "increment",
      "accounts": [
        {
          "name": "counter",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "authority",
          "isMut": false,
          "isSigner": true
        }
      ],
      "args": []
    },
    {
      "name": "decrement",
      "accounts": [
        {
          "name": "counter",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "authority",
          "isMut": false,
          "isSigner": true
        }
      ],
      "args": []
    },
    {
      "name": "reset",
      "accounts": [
        {
          "name": "counter",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "authority",
          "isMut": false,
          "isSigner": true
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "Counter",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "count",
            "type": "i64"
          },
          {
            "name": "authority",
            "type": "publicKey"
          }
        ]
      }
    }
  ]
};

// In a real app, this would be your deployed program ID
const PROGRAM_ID = new PublicKey("11111111111111111111111111111113");

export function useCounterProgram() {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const { cluster } = useCluster();
  const [count, setCount] = useState<number | null>(null);
  const [counterPDA, setCounterPDA] = useState<PublicKey | null>(null);
  const [loading, setLoading] = useState(false);

  const getProvider = () => {
    if (!wallet) {
      throw new Error("Wallet not connected");
    }
    return new AnchorProvider(connection, wallet, { commitment: "processed" });
  };

  const getProgram = () => {
    const provider = getProvider();
    // @ts-ignore - In a real app, we would import the proper types
    return new Program(IDL, PROGRAM_ID, provider);
  };

  const findOrCreateCounterPDA = async () => {
    if (!wallet?.publicKey) return null;
    
    // In a real app, you would use the proper PDA derivation
    // This is a simplified approach for demonstration
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("counter"), wallet.publicKey.toBuffer()],
      PROGRAM_ID
    );
    
    setCounterPDA(pda);
    return pda;
  };

  const fetchCounter = async () => {
    if (!wallet?.publicKey || !counterPDA) return;
    
    try {
      const program = getProgram();
      const account = await program.account.counter.fetch(counterPDA);
      setCount(Number(account.count));
    } catch (error) {
      console.log("Counter account not found or other error:", error);
      setCount(null);
    }
  };

  useEffect(() => {
    if (wallet?.publicKey) {
      findOrCreateCounterPDA().then(() => {
        fetchCounter();
      });
    } else {
      setCount(null);
      setCounterPDA(null);
    }
  }, [wallet?.publicKey, cluster.name]);

  const initialize = async () => {
    if (!wallet?.publicKey) {
      toast.error("Please connect your wallet");
      return;
    }

    try {
      setLoading(true);
      const program = getProgram();
      
      // Create a new keypair for the counter account
      const counterKeypair = web3.Keypair.generate();
      setCounterPDA(counterKeypair.publicKey);
      
      const tx = await program.methods
        .initialize()
        .accounts({
          counter: counterKeypair.publicKey,
          authority: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([counterKeypair])
        .rpc();
      
      await connection.confirmTransaction(tx, "confirmed");
      await fetchCounter();
      
      return tx;
    } catch (error: any) {
      console.error("Error initializing counter:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const increment = async () => {
    if (!wallet?.publicKey || !counterPDA) {
      toast.error("Please connect your wallet and initialize counter");
      return;
    }

    try {
      setLoading(true);
      const program = getProgram();
      
      const tx = await program.methods
        .increment()
        .accounts({
          counter: counterPDA,
          authority: wallet.publicKey,
        })
        .rpc();
      
      await connection.confirmTransaction(tx, "confirmed");
      setCount((prev) => prev !== null ? prev + 1 : 1);
      
      return tx;
    } catch (error: any) {
      console.error("Error incrementing counter:", error);
      toast.error("Error incrementing counter: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const decrement = async () => {
    if (!wallet?.publicKey || !counterPDA) {
      toast.error("Please connect your wallet and initialize counter");
      return;
    }

    try {
      setLoading(true);
      const program = getProgram();
      
      const tx = await program.methods
        .decrement()
        .accounts({
          counter: counterPDA,
          authority: wallet.publicKey,
        })
        .rpc();
      
      await connection.confirmTransaction(tx, "confirmed");
      setCount((prev) => prev !== null && prev > 0 ? prev - 1 : 0);
      
      return tx;
    } catch (error: any) {
      console.error("Error decrementing counter:", error);
      toast.error("Error decrementing counter: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = async () => {
    if (!wallet?.publicKey || !counterPDA) {
      toast.error("Please connect your wallet and initialize counter");
      return;
    }

    try {
      setLoading(true);
      const program = getProgram();
      
      const tx = await program.methods
        .reset()
        .accounts({
          counter: counterPDA,
          authority: wallet.publicKey,
        })
        .rpc();
      
      await connection.confirmTransaction(tx, "confirmed");
      setCount(0);
      
      return tx;
    } catch (error: any) {
      console.error("Error resetting counter:", error);
      toast.error("Error resetting counter: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return {
    count,
    loading,
    initialize,
    increment,
    decrement,
    reset,
  };
}
</forgeAction>

<forgeAction type="file" filePath="src/components/cluster/cluster-data-access.tsx">
"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { clusterApiUrl } from "@solana/web3.js";

export interface Cluster {
  name: string;
  endpoint: string;
  network?: WalletAdapterNetwork;
}

export interface ClusterContextState {
  cluster: Cluster;
  clusters: Cluster[];
  setCluster: (cluster: Cluster) => void;
}

const CLUSTERS: Cluster[] = [
  {
    name: "Mainnet Beta",
    endpoint: clusterApiUrl("mainnet-beta"),
    network: WalletAdapterNetwork.Mainnet,
  },
  {
    name: "Testnet",
    endpoint: clusterApiUrl("testnet"),
    network: WalletAdapterNetwork.Testnet,
  },
  {
    name: "Devnet",
    endpoint: clusterApiUrl("devnet"),
    network: WalletAdapterNetwork.Devnet,
  },
  {
    name: "Localnet",
    endpoint: "http://localhost:8899",
  },
];

const DEFAULT_CLUSTER = CLUSTERS[2]; // Devnet

export const ClusterContext = createContext<ClusterContextState>({
  cluster: DEFAULT_CLUSTER,
  clusters: CLUSTERS,
  setCluster: () => {},
});

export function ClusterProvider({ children }: { children: ReactNode }) {
  const [cluster, setCluster] = useState<Cluster>(DEFAULT_CLUSTER);

  useEffect(() => {
    const savedClusterName = localStorage.getItem("cluster");
    if (savedClusterName) {
      const savedCluster = CLUSTERS.find((c) => c.name === savedClusterName);
      if (savedCluster) {
        setCluster(savedCluster);
      }
    }
  }, []);

  const updateCluster = (newCluster: Cluster) => {
    localStorage.setItem("cluster", newCluster.name);
    setCluster(newCluster);
  };

  return (
    <ClusterContext.Provider
      value={{
        cluster,
        clusters: CLUSTERS,
        setCluster: updateCluster,
      }}
    >
      {children}
    </ClusterContext.Provider>
  );
}

export function useCluster() {
  return useContext(ClusterContext);
}
</forgeAction>

<forgeAction type="file" filePath="src/components/cluster/cluster-ui.tsx">
"use client";

import { useCluster } from "./cluster-data-access";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function ClusterUiSelect() {
  const { cluster, clusters, setCluster } = useCluster();

  return (
    <Select
      value={cluster.name}
      onValueChange={(value) => {
        const newCluster = clusters.find((c) => c.name === value);
        if (newCluster) {
          setCluster(newCluster);
        }
      }}
    >
      <SelectTrigger className="w-[140px]">
        <SelectValue placeholder="Select network" />
      </SelectTrigger>
      <SelectContent>
        {clusters.map((c) => (
          <SelectItem key={c.name} value={c.name}>
            {c.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
</forgeAction>

<forgeAction type="file" filePath="src/components/solana/wallet-button.tsx">
"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function WalletButton() {
  const { publicKey, disconnect } = useWallet();
  const [copied, setCopied] = useState(false);

  const copyAddress = async () => {
    if (publicKey) {
      await navigator.clipboard.writeText(publicKey.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!publicKey) {
    return <WalletMultiButton />;
  }

  const address = publicKey.toString();
  const shortAddress = \`$\{address.slice(0, 4)}...$\{address.slice(-4)}\`;

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={copyAddress}
        className="flex items-center gap-2"
      >
        <span>{copied ? "Copied!" : shortAddress}</span>
      </Button>
      <Button variant="ghost" size="sm" onClick={() => disconnect()}>
        Disconnect
      </Button>
    </div>
  );
}
</forgeAction>

<forgeAction type="file" filePath="src/components/theme-select.tsx">
"use client";

import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";

export function ThemeSelect() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label="Toggle theme"
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  );
}
</forgeAction>

<forgeAction type="file" filePath="src/components/app-footer.tsx">
import { Github } from "lucide-react";

export function AppFooter() {
  return (
    <footer className="border-t py-6 md:py-8">
      <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
        <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
          Built with Next.js, TypeScript, and Anchor on Solana
        </p>
        <div className="flex items-center gap-4">
          <a
            href="https://github.com/solana-labs"
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium underline underline-offset-4"
          >
            <Github className="h-5 w-5" />
          </a>
        </div>
      </div>
    </footer>
  );
}
</forgeAction>

<forgeAction type="file" filePath="src/components/ui/button.tsx">
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
</forgeAction>

<forgeAction type="file" filePath="src/components/ui/card.tsx">
import * as React from "react";
import { cn } from "@/lib/utils";

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-lg border bg-card text-card-foreground shadow-sm",
      className
    )}
    {...props}
  />
));
Card.displayName = "Card";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
};
</forgeAction>

<forgeAction type="file" filePath="src/components/ui/select.tsx">
"use client";

import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

const Select = SelectPrimitive.Root;
const SelectGroup = SelectPrimitive.Group;
const SelectValue = SelectPrimitive.Value;

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center py-1",
      className
    )}
    {...props}
  >
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
));
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center py-1",
      className
    )}
    {...props}
  >
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
));
SelectScrollDownButton.displayName =
  SelectPrimitive.ScrollDownButton.displayName;

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        "relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data
</forgeArtifact>
`

export default function BuilderDemo() {
  const handleStepsChange = useCallback((steps: Step[]) => {
    console.log('Steps changed:', steps);
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Builder Demo</h1>
      <p className="mb-6 text-muted-foreground">
        This demonstrates parsing forge XML into executable steps.
      </p>
      
      <Builder 
        response={sampleForgeXml} 
        onStepsChange={handleStepsChange}
      />
    </div>
  );
} 