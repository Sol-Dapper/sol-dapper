export const basePrompt = `<forgeArtifact id="solana-project-import" title="Solana DApp Project Files"><forgeAction type="file" filePath="package.json">{
    "name": "solana-dapp",
    "version": "0.1.0",
    "private": true,
    "scripts": {
      "dev": "next dev",
      "build": "next build",
      "start": "next start",
      "lint": "next lint",
      "anchor": "anchor",
      "anchor:build": "anchor build",
      "anchor:sync": "anchor sync",
      "generate": "pnpm anchor:build && pnpm anchor:sync"
    },
    "dependencies": {
      "@coral-xyz/anchor": "^0.30.1",
      "@radix-ui/react-select": "^2.0.0",
      "@radix-ui/react-slot": "^1.0.2",
      "@solana/wallet-adapter-base": "^0.9.23",
      "@solana/wallet-adapter-react": "^0.15.35",
      "@solana/wallet-adapter-react-ui": "^0.9.35",
      "@solana/wallet-adapter-wallets": "^0.19.32",
      "@solana/web3.js": "^1.95.2",
      "@tanstack/react-query": "^5.51.23",
      "jotai": "^2.8.0",
      "class-variance-authority": "^0.7.0",
      "clsx": "^2.1.1",
      "lucide-react": "^0.427.0",
      "next": "14.2.5",
      "next-themes": "^0.3.0",
      "react": "^18.3.1",
      "react-dom": "^18.3.1",
      "react-hot-toast": "^2.4.1",
      "sonner": "^1.5.0",
      "tailwind-merge": "^2.4.0",
      "tailwindcss-animate": "^1.0.7"
    },
    "devDependencies": {
      "@types/node": "^20.14.14",
      "@types/react": "^18.3.3",
      "@types/react-dom": "^18.3.0",
      "autoprefixer": "^10.4.20",
      "eslint": "^8.57.0",
      "eslint-config-next": "14.2.5",
      "postcss": "^8.4.40",
      "prettier": "^3.3.3",
      "tailwindcss": "^3.4.7",
      "typescript": "^5.5.4"
    }
  }
  </forgeAction><forgeAction type="file" filePath="next.config.js">/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
  </forgeAction><forgeAction type="file" filePath="tsconfig.json">{
    "compilerOptions": {
      "lib": ["dom", "dom.iterable", "es6"],
      "allowJs": true,
      "skipLibCheck": true,
      "strict": true,
      "noEmit": true,
      "esModuleInterop": true,
      "module": "esnext",
      "moduleResolution": "bundler",
      "resolveJsonModule": true,
      "isolatedModules": true,
      "jsx": "preserve",
      "incremental": true,
      "plugins": [
        {
          "name": "next"
        }
      ],
      "baseUrl": ".",
      "paths": {
        "@/*": ["./src/*"]
      }
    },
    "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
    "exclude": ["node_modules", "anchor/target"]
  }
  </forgeAction><forgeAction type="file" filePath="anchor/Anchor.toml">[features]
  seeds = false
  skip-lint = false
  
  [programs.localnet]
  basic = "11111111111111111111111111111112"
  
  [registry]
  url = "https://api.apr.dev"
  
  [provider]
  cluster = "Localnet"
  wallet = "~/.config/solana/id.json"
  
  [scripts]
  test = "pnpm exec tsx anchor/tests/basic.test.ts"
  </forgeAction><forgeAction type="file" filePath="anchor/Cargo.toml">[workspace]
  members = [
      "programs/*"
  ]
  resolver = "2"
  
  [profile.release]
  overflow-checks = true
  lto = "fat"
  codegen-units = 1
  
  [profile.release.build-override]
  opt-level = 3
  incremental = false
  codegen-units = 1
  </forgeAction><forgeAction type="file" filePath="anchor/programs/basic/Cargo.toml">[package]
  name = "basic"
  version = "0.1.0"
  description = "Created with Anchor"
  edition = "2021"
  
  [lib]
  crate-type = ["cdylib", "lib"]
  name = "basic"
  
  [features]
  no-entrypoint = []
  no-idl = []
  no-log-ix-name = []
  cpi = ["no-entrypoint"]
  default = []
  
  [dependencies]
  anchor-lang = "0.30.1"
  </forgeAction><forgeAction type="file" filePath="anchor/programs/basic/src/lib.rs">use anchor_lang::prelude::*;
  
  declare_id!("11111111111111111111111111111112");
  
  #[program]
  pub mod basic {
      use super::*;
  
      pub fn initialize(_ctx: Context<Initialize>) -> Result<()> {
          msg!("Greetings from: {:?}", ctx.program_id);
          Ok(())
      }
  }
  
  #[derive(Accounts)]
  pub struct Initialize {}
  </forgeAction><forgeAction type="file" filePath="src/app/layout.tsx">import type { Metadata } from 'next';
  import './globals.css';
  import { AppProviders } from '@/components/app-providers';
  import { AppLayout } from '@/components/app-layout';
  import { Toaster } from '@/components/ui/sonner';
  
  export const metadata: Metadata = {
    title: 'Solana DApp',
    description: 'A Solana decentralized application',
  };
  
  export default function RootLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return (
      <html lang="en" suppressHydrationWarning>
        <body>
          <AppProviders>
            <AppLayout>{children}</AppLayout>
            <Toaster position="bottom-right" />
          </AppProviders>
        </body>
      </html>
    );
  }
  </forgeAction><forgeAction type="file" filePath="src/app/page.tsx">import { AppHero } from '@/components/app-hero';
  
  export default function Page() {
    return (
      <div>
        <AppHero />
      </div>
    );
  }
  </forgeAction><forgeAction type="file" filePath="src/app/globals.css">@tailwind base;
  @tailwind components;
  @tailwind utilities;
  
  @layer base {
    :root {
      --background: 0 0% 100%;
      --foreground: 222.2 84% 4.9%;
      --card: 0 0% 100%;
      --card-foreground: 222.2 84% 4.9%;
      --popover: 0 0% 100%;
      --popover-foreground: 222.2 84% 4.9%;
      --primary: 222.2 47.4% 11.2%;
      --primary-foreground: 210 40% 98%;
      --secondary: 210 40% 96%;
      --secondary-foreground: 222.2 47.4% 11.2%;
      --muted: 210 40% 96%;
      --muted-foreground: 215.4 16.3% 46.9%;
      --accent: 210 40% 96%;
      --accent-foreground: 222.2 47.4% 11.2%;
      --destructive: 0 84.2% 60.2%;
      --destructive-foreground: 210 40% 98%;
      --border: 214.3 31.8% 91.4%;
      --input: 214.3 31.8% 91.4%;
      --ring: 222.2 84% 4.9%;
      --radius: 0.5rem;
      --chart-1: 12 76% 61%;
      --chart-2: 173 58% 39%;
      --chart-3: 197 37% 24%;
      --chart-4: 43 74% 66%;
      --chart-5: 27 87% 67%;
    }
  
    .dark {
      --background: 222.2 84% 4.9%;
      --foreground: 210 40% 98%;
      --card: 222.2 84% 4.9%;
      --card-foreground: 210 40% 98%;
      --popover: 222.2 84% 4.9%;
      --popover-foreground: 210 40% 98%;
      --primary: 210 40% 98%;
      --primary-foreground: 222.2 47.4% 11.2%;
      --secondary: 217.2 32.6% 17.5%;
      --secondary-foreground: 210 40% 98%;
      --muted: 217.2 32.6% 17.5%;
      --muted-foreground: 215 20.2% 65.1%;
      --accent: 217.2 32.6% 17.5%;
      --accent-foreground: 210 40% 98%;
      --destructive: 0 62.8% 30.6%;
      --destructive-foreground: 210 40% 98%;
      --border: 217.2 32.6% 17.5%;
      --input: 217.2 32.6% 17.5%;
      --ring: 212.7 26.8% 83.9%;
      --chart-1: 220 70% 50%;
      --chart-2: 160 60% 45%;
      --chart-3: 30 80% 55%;
      --chart-4: 280 65% 60%;
      --chart-5: 340 75% 55%;
    }
  }
  
  @layer base {
    * {
      @apply border-border;
    }
    body {
      @apply bg-background text-foreground;
    }
  }
  </forgeAction><forgeAction type="file" filePath="src/components/app-providers.tsx">import { ReactQueryProvider } from './react-query-provider';
  import { SolanaProvider } from './solana/solana-provider';
  import { ThemeProvider } from './theme-provider';
  
  export function AppProviders({ children }: { children: React.ReactNode }) {
    return (
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <ReactQueryProvider>
          <SolanaProvider>
            {children}
          </SolanaProvider>
        </ReactQueryProvider>
      </ThemeProvider>
    );
  }
  </forgeAction><forgeAction type="file" filePath="src/components/app-layout.tsx">import { ReactNode } from 'react';
  import { AppHeader } from './app-header';
  import { AppFooter } from './app-footer';
  
  export function AppLayout({ children }: { children: ReactNode }) {
    return (
      <div className="flex flex-col min-h-screen">
        <AppHeader />
        <main className="flex-grow">
          {children}
        </main>
        <AppFooter />
      </div>
    );
  }
  </forgeAction><forgeAction type="file" filePath="src/components/app-header.tsx">import Link from 'next/link';
  import dynamic from 'next/dynamic';
  import { WalletButton } from './solana/wallet-button';
  import { ClusterUiSelect } from './cluster/cluster-ui';
  import { ThemeSelect } from './theme-select';
  
  const WalletMultiButton = dynamic(
    async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
    { ssr: false }
  );
  
  export function AppHeader() {
    return (
      <header className="flex justify-between items-center p-4 border-b">
        <div className="flex items-center space-x-4">
          <Link href="/" className="text-2xl font-bold">
            Solana DApp
          </Link>
          <nav className="flex space-x-4">
            <Link href="/basic" className="hover:underline">
              Basic
            </Link>
            <Link href="/account" className="hover:underline">
              Account
            </Link>
          </nav>
        </div>
        <div className="flex items-center space-x-4">
          <ClusterUiSelect />
          <ThemeSelect />
          <WalletMultiButton />
        </div>
      </header>
    );
  }
  </forgeAction><forgeAction type="file" filePath="src/components/app-hero.tsx">import Link from 'next/link';
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
  import { Button } from './ui/button';
  
  export function AppHero() {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Welcome to Your Solana DApp</h1>
          <p className="text-xl text-muted-foreground">
            Built with Next.js, TypeScript, and Anchor
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Basic Program</CardTitle>
              <CardDescription>
                Interact with the basic Anchor program
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/basic">Try Basic Program</Link>
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Account Explorer</CardTitle>
              <CardDescription>
                Explore Solana accounts and their data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/account">Explore Accounts</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  </forgeAction><forgeAction type="file" filePath="src/components/solana/solana-provider.tsx">import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
  import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
  import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
  import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
  import { clusterApiUrl } from '@solana/web3.js';
  import { ReactNode, useMemo } from 'react';
  import { useCluster } from '../cluster/cluster-data-access';
  
  require('@solana/wallet-adapter-react-ui/styles.css');
  
  export function SolanaProvider({ children }: { children: ReactNode }) {
    const { cluster } = useCluster();
    const endpoint = useMemo(() => cluster.endpoint, [cluster]);
    const wallets = useMemo(
      () => [
        new PhantomWalletAdapter(),
        new SolflareWalletAdapter(),
      ],
      []
    );
  
    return (
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>
            {children}
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    );
  }
  </forgeAction><forgeAction type="file" filePath="src/components/react-query-provider.tsx">import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
  import { ReactNode, useState } from 'react';
  
  export function ReactQueryProvider({ children }: { children: ReactNode }) {
    const [queryClient] = useState(() => new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    }));
  
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  }
  </forgeAction><forgeAction type="file" filePath="src/components/theme-provider.tsx">'use client';
  
  import * as React from 'react';
  import { ThemeProvider as NextThemesProvider } from 'next-themes';
  import { type ThemeProviderProps } from 'next-themes/dist/types';
  
  export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
    return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
  }
  </forgeAction><forgeAction type="file" filePath="tailwind.config.js">const { fontFamily } = require("tailwindcss/defaultTheme");
  
  /** @type {import('tailwindcss').Config} */
  module.exports = {
    darkMode: ["class"],
    content: [
      './src/pages/**/*.{ts,tsx}',
      './src/components/**/*.{ts,tsx}',
      './src/app/**/*.{ts,tsx}',
    ],
    theme: {
      container: {
        center: true,
        padding: "2rem",
        screens: {
          "2xl": "1400px",
        },
      },
      extend: {
        colors: {
          border: "hsl(var(--border))",
          input: "hsl(var(--input))",
          ring: "hsl(var(--ring))",
          background: "hsl(var(--background))",
          foreground: "hsl(var(--foreground))",
          primary: {
            DEFAULT: "hsl(var(--primary))",
            foreground: "hsl(var(--primary-foreground))",
          },
          secondary: {
            DEFAULT: "hsl(var(--secondary))",
            foreground: "hsl(var(--secondary-foreground))",
          },
          destructive: {
            DEFAULT: "hsl(var(--destructive))",
            foreground: "hsl(var(--destructive-foreground))",
          },
          muted: {
            DEFAULT: "hsl(var(--muted))",
            foreground: "hsl(var(--muted-foreground))",
          },
          accent: {
            DEFAULT: "hsl(var(--accent))",
            foreground: "hsl(var(--accent-foreground))",
          },
          popover: {
            DEFAULT: "hsl(var(--popover))",
            foreground: "hsl(var(--popover-foreground))",
          },
          card: {
            DEFAULT: "hsl(var(--card))",
            foreground: "hsl(var(--card-foreground))",
          },
        },
        borderRadius: {
          lg: "var(--radius)",
          md: "calc(var(--radius) - 2px)",
          sm: "calc(var(--radius) - 4px)",
        },
        fontFamily: {
          sans: ["var(--font-sans)", ...fontFamily.sans],
        },
        keyframes: {
          "accordion-down": {
            from: { height: 0 },
            to: { height: "var(--radix-accordion-content-height)" },
          },
          "accordion-up": {
            from: { height: "var(--radix-accordion-content-height)" },
            to: { height: 0 },
          },
        },
        animation: {
          "accordion-down": "accordion-down 0.2s ease-out",
          "accordion-up": "accordion-up 0.2s ease-out",
        },
      },
    },
    plugins: [require("tailwindcss-animate")],
  };
  </forgeAction><forgeAction type="file" filePath="postcss.config.mjs">/** @type {import('postcss-load-config').Config} */
  const config = {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  };
  
  export default config;
  </forgeAction><forgeAction type="file" filePath="postcss.config.js">module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
  </forgeAction></forgeArtifact>`;