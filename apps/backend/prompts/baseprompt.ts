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
      "@radix-ui/react-dialog": "^1.0.5",
      "@radix-ui/react-label": "^2.0.2", 
      "@radix-ui/react-scroll-area": "^1.0.5",
      "@radix-ui/react-select": "^2.0.0",
      "@radix-ui/react-separator": "^1.0.3",
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
      "date-fns": "^4.1.0",
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
  </forgeAction><forgeAction type="file" filePath="src/components/app-providers.tsx">"use client";

import { ReactQueryProvider } from './react-query-provider';
  import { ThemeProvider } from './theme-provider';
  import dynamic from 'next/dynamic';
  
  const SolanaProvider = dynamic(
    () => import('./solana/solana-provider').then(mod => ({ default: mod.SolanaProvider })),
    { ssr: false }
  );
  
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
  </forgeAction><forgeAction type="file" filePath="src/components/react-query-provider.tsx">"use client";

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
  </forgeAction><forgeAction type="file" filePath="src/components/app-layout.tsx">'use client';

import { ReactNode } from 'react';
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
  </forgeAction><forgeAction type="file" filePath="src/components/app-header.tsx">'use client';

import Link from 'next/link';
  import dynamic from 'next/dynamic';
  import { ThemeSelect } from './theme-select';
  
  const ClusterUiSelect = dynamic(
    () => import('./cluster/cluster-ui').then(mod => ({ default: mod.ClusterUiSelect })),
    { ssr: false }
  );
  
  const WalletButton = dynamic(
    () => import('./solana/wallet-button').then(mod => ({ default: mod.WalletButton })),
    { ssr: false }
  );
  
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
  </forgeAction><forgeAction type="file" filePath="src/components/solana/wallet-button.tsx">"use client";

import { useWallet } from '@solana/wallet-adapter-react';
import { Button } from '@/components/ui/button';
import { truncateAddress } from '@/lib/utils';
import dynamic from 'next/dynamic';

const WalletMultiButton = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false }
);

export function WalletButton() {
  const { publicKey, disconnect } = useWallet();

  if (publicKey) {
    return (
      <div className="flex items-center space-x-2">
        <span className="text-sm text-muted-foreground">
          {truncateAddress(publicKey.toBase58())}
        </span>
        <Button variant="outline" size="sm" onClick={disconnect}>
          Disconnect
        </Button>
      </div>
    );
  }

  return <WalletMultiButton />;
}
  </forgeAction><forgeAction type="file" filePath="src/components/solana/solana-provider.tsx">'use client';

import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
  import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
  import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
  import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
  import { clusterApiUrl } from '@solana/web3.js';
  import { ReactNode, useMemo } from 'react';
  import { useCluster } from '../cluster/cluster-data-access';
  
  // Import wallet adapter styles only on client
  if (typeof window !== 'undefined') {
    require('@solana/wallet-adapter-react-ui/styles.css');
  }
  
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
  </forgeAction><forgeAction type="file" filePath="src/components/react-query-provider.tsx">"use client";

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
  </forgeAction><forgeAction type="directory" dirPath="src/components/ui"></forgeAction><forgeAction type="file" filePath="src/components/ui/button.tsx">import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
</forgeAction><forgeAction type="file" filePath="src/components/ui/input.tsx">import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input">
>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Input.displayName = "Input"

export { Input }
</forgeAction><forgeAction type="file" filePath="src/components/ui/label.tsx">"use client"

import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const labelVariants = cva(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
)

const Label = React.forwardRef<
  React.ComponentRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> &
    VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(labelVariants(), className)}
    {...props}
  />
))
Label.displayName = LabelPrimitive.Root.displayName

export { Label }
</forgeAction><forgeAction type="file" filePath="src/components/ui/badge.tsx">import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
</forgeAction><forgeAction type="file" filePath="src/components/ui/card.tsx">import * as React from "react"

import { cn } from "@/lib/utils"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-xl border bg-card text-card-foreground shadow",
      className
    )}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("font-semibold leading-none tracking-tight", className)} {...props} />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
</forgeAction><forgeAction type="file" filePath="src/components/ui/separator.tsx">"use client"

import * as React from "react"
import * as SeparatorPrimitive from "@radix-ui/react-separator"

import { cn } from "@/lib/utils"

const Separator = React.forwardRef<
  React.ComponentRef<typeof SeparatorPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>
>(
  (
    { className, orientation = "horizontal", decorative = true, ...props },
    ref
  ) => (
    <SeparatorPrimitive.Root
      ref={ref}
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "shrink-0 bg-border",
        orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
        className
      )}
      {...props}
    />
  )
)
Separator.displayName = SeparatorPrimitive.Root.displayName

export { Separator }
</forgeAction><forgeAction type="file" filePath="src/components/ui/dialog.tsx">"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
</forgeAction><forgeAction type="file" filePath="src/components/ui/alert.tsx">import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const alertVariants = cva(
  "relative w-full rounded-lg border px-4 py-3 text-sm [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground [&>svg~*]:pl-7",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        destructive:
          "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
))
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-medium leading-none tracking-tight", className)}
    {...props}
  />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed", className)}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertTitle, AlertDescription }
</forgeAction><forgeAction type="file" filePath="src/components/ui/scroll-area.tsx">"use client"

import * as React from "react"
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area"

import { cn } from "@/lib/utils"

const ScrollArea = React.forwardRef<
  React.ComponentRef<typeof ScrollAreaPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root>
>(({ className, children, ...props }, ref) => (
  <ScrollAreaPrimitive.Root
    ref={ref}
    className={cn("relative overflow-hidden", className)}
    {...props}
  >
    <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit]">
      {children}
    </ScrollAreaPrimitive.Viewport>
    <ScrollBar />
    <ScrollAreaPrimitive.Corner />
  </ScrollAreaPrimitive.Root>
))
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName

const ScrollBar = React.forwardRef<
  React.ComponentRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>
>(({ className, orientation = "vertical", ...props }, ref) => (
  <ScrollAreaPrimitive.ScrollAreaScrollbar
    ref={ref}
    orientation={orientation}
    className={cn(
      "flex touch-none select-none transition-colors",
      orientation === "vertical" &&
        "h-full w-2.5 border-l border-l-transparent p-[1px]",
      orientation === "horizontal" &&
        "h-2.5 flex-col border-t border-t-transparent p-[1px]",
      className
    )}
    {...props}
  >
    <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-border" />
  </ScrollAreaPrimitive.ScrollAreaScrollbar>
))
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName

export { ScrollArea, ScrollBar }
</forgeAction><forgeAction type="file" filePath="src/components/ui/sonner.tsx">"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
</forgeAction><forgeAction type="file" filePath="src/components/theme-select.tsx">'use client';

import { useTheme } from 'next-themes';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

export function ThemeSelect() {
  const { theme, setTheme } = useTheme();

  return (
    <Select value={theme} onValueChange={setTheme}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select theme" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="light">Light</SelectItem>
        <SelectItem value="dark">Dark</SelectItem>
        <SelectItem value="system">System</SelectItem>
      </SelectContent>
    </Select>
  );
}
</forgeAction><forgeAction type="file" filePath="src/components/app-footer.tsx">import Link from 'next/link';

export function AppFooter() {
  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <p className="text-sm text-muted-foreground">
              Built with Next.js and Solana
            </p>
          </div>
          
          <div className="flex items-center space-x-6">
            <Link 
              href="https://solana.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Solana
            </Link>
            <Link 
              href="https://nextjs.org" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Next.js
            </Link>
            <Link 
              href="https://tailwindcss.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Tailwind CSS
            </Link>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            © {new Date().getFullYear()} Solana DApp. Open source and built for the community.
          </p>
        </div>
      </div>
    </footer>
  );
}
</forgeAction><forgeAction type="file" filePath="src/lib/utils.ts">import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date))
}

export function formatDateTime(date: Date | string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date))
}

export function formatRelativeTime(date: Date | string) {
  const now = new Date()
  const targetDate = new Date(date)
  const diffInSeconds = Math.floor((now.getTime() - targetDate.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return "just now"
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60)
    return minutes + " " + (minutes === 1 ? "minute" : "minutes") + " ago"
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600)
    return hours + " " + (hours === 1 ? "hour" : "hours") + " ago"
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400)
    return days + " " + (days === 1 ? "day" : "days") + " ago"
  } else {
    return formatDate(targetDate)
  }
}

export function truncateAddress(address: string, chars = 4) {
  if (!address) return ""
  if (address.length <= chars * 2) return address
  return address.slice(0, chars) + "..." + address.slice(-chars)
}

export function formatTokenAmount(amount: number | string, decimals = 9, precision = 2) {
  const num = typeof amount === "string" ? parseFloat(amount) : amount
  if (isNaN(num)) return "0"
  
  // Convert from smallest unit to main unit
  const adjusted = num / Math.pow(10, decimals)
  
  // Format with appropriate precision
  if (adjusted >= 1000000) {
    return (adjusted / 1000000).toFixed(precision) + "M"
  } else if (adjusted >= 1000) {
    return (adjusted / 1000).toFixed(precision) + "K"
  } else if (adjusted < 0.01 && adjusted > 0) {
    return adjusted.toExponential(2)
  } else {
    return adjusted.toFixed(precision)
  }
}

export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function copyToClipboard(text: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    return navigator.clipboard.writeText(text)
  }
  
  // Fallback for older browsers
  const textArea = document.createElement("textarea")
  textArea.value = text
  document.body.appendChild(textArea)
  textArea.select()
  document.execCommand("copy")
  document.body.removeChild(textArea)
  return Promise.resolve()
}
</forgeAction><forgeAction type="file" filePath="src/components/cluster/cluster-data-access.tsx">'use client';

import { clusterApiUrl, Connection } from '@solana/web3.js';
import { atom, useAtomValue, useSetAtom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { createContext, ReactNode, useContext } from 'react';
import toast from 'react-hot-toast';

export interface Cluster {
  name: string;
  endpoint: string;
  network?: ClusterNetwork;
  active?: boolean;
}

export enum ClusterNetwork {
  Mainnet = 'mainnet-beta',
  Testnet = 'testnet',
  Devnet = 'devnet',
  Custom = 'custom',
}

export const defaultClusters: Cluster[] = [
  {
    name: 'devnet',
    endpoint: clusterApiUrl('devnet'),
    network: ClusterNetwork.Devnet,
  },
  {
    name: 'local',
    endpoint: 'http://localhost:8899',
    network: ClusterNetwork.Custom,
  },
  {
    name: 'testnet',
    endpoint: clusterApiUrl('testnet'),
    network: ClusterNetwork.Testnet,
  },
  {
    name: 'mainnet',
    endpoint: clusterApiUrl('mainnet-beta'),
    network: ClusterNetwork.Mainnet,
  },
];

const clusterAtom = atomWithStorage<Cluster>(
  'solana-cluster',
  defaultClusters[0]
);
const clustersAtom = atomWithStorage<Cluster[]>(
  'solana-clusters',
  defaultClusters
);

const activeClustersAtom = atom<Cluster[]>((get) => {
  const clusters = get(clustersAtom);
  const cluster = get(clusterAtom);
  return clusters.map((item) => ({
    ...item,
    active: item.name === cluster.name,
  }));
});

const activeClusterAtom = atom<Cluster>((get) => {
  const clusters = get(activeClustersAtom);

  return clusters.find((item) => item.active) || clusters[0];
});

export function useCluster() {
  return {
    cluster: useAtomValue(activeClusterAtom),
    clusters: useAtomValue(activeClustersAtom),
    addCluster: useSetAtom(
      atom(null, (get, set, cluster: Cluster) => {
        const clusters = get(clustersAtom);
        set(clustersAtom, [...clusters, cluster]);
      })
    ),
    setCluster: useSetAtom(
      atom(null, (get, set, cluster: Cluster) => {
        set(clusterAtom, cluster);
      })
    ),
    deleteCluster: useSetAtom(
      atom(null, (get, set, cluster: Cluster) => {
        const clusters = get(clustersAtom);
        set(
          clustersAtom,
          clusters.filter((item) => item.name !== cluster.name)
        );
      })
    ),
  };
}

export function validateConnection(endpoint: string): Promise<Connection> {
  return new Promise((resolve, reject) => {
    const connection = new Connection(endpoint, 'confirmed');
    connection
      .getLatestBlockhash()
      .then(() => resolve(connection))
      .catch((err) => {
        reject(err);
      });
  });
}

export function ClusterChecker({ children }: { children: ReactNode }) {
  const { cluster } = useCluster();

  return (
    <div>
      <div className="alert alert-info flex justify-start space-x-2">
        <span>
          You are connected to <strong>{cluster.name}</strong> cluster
        </span>
        <button
          className="btn btn-xs btn-neutral"
          onClick={async () => {
            try {
              await validateConnection(cluster.endpoint);
              toast.success('Connection successful');
            } catch (error) {
              toast.error('Connection failed: ' + String(error));
            }
          }}
        >
          Check
        </button>
      </div>
      {children}
    </div>
  );
}

interface ClusterProviderContext {
  cluster: Cluster;
  clusters: Cluster[];
  addCluster: (cluster: Cluster) => void;
  setCluster: (cluster: Cluster) => void;
  deleteCluster: (cluster: Cluster) => void;
}

const Context = createContext<ClusterProviderContext>(
  {} as ClusterProviderContext
);

export function ClusterProvider({ children }: { children: ReactNode }) {
  const value = useCluster();
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useClusterProvider() {
  return useContext(Context);
}
</forgeAction><forgeAction type="file" filePath="src/components/cluster/cluster-ui.tsx">'use client';

import { useState } from 'react';
import { ClusterNetwork, useCluster, validateConnection, Cluster } from './cluster-data-access';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import toast from 'react-hot-toast';

export function ClusterUiSelect() {
  const { clusters, setCluster, cluster } = useCluster();
  return (
    <div className="dropdown dropdown-end">
      <Select
        value={cluster.name}
        onValueChange={(value) => {
          const selected = clusters.find((item) => item.name === value);
          if (selected) {
            setCluster(selected);
          }
        }}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select cluster" />
        </SelectTrigger>
        <SelectContent>
          {clusters.map((item) => (
            <SelectItem key={item.name} value={item.name}>
              <div className="flex items-center space-x-2">
                <span>{item.name}</span>
                {item.active && <Badge variant="default" className="text-xs">Active</Badge>}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function ClusterUiModal({
  hideModal,
  show,
}: {
  hideModal: () => void;
  show: boolean;
}) {
  const { addCluster } = useCluster();
  const [name, setName] = useState('');
  const [network, setNetwork] = useState<ClusterNetwork | undefined>();
  const [endpoint, setEndpoint] = useState('');

  const validateAndAdd = async () => {
    if (!name || !endpoint) {
      toast.error('Name and endpoint are required');
      return;
    }
    
    try {
      await validateConnection(endpoint);
      addCluster({ name, network, endpoint });
      toast.success('Cluster added successfully');
      hideModal();
    } catch (error) {
      toast.error('Failed to connect to cluster: ' + String(error));
    }
  };

  if (!show) {
    return <div />;
  }

  return (
    <Dialog open={show} onOpenChange={hideModal}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Cluster</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="Cluster name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="endpoint">Endpoint</Label>
            <Input
              id="endpoint"
              placeholder="Cluster RPC endpoint"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="network">Network</Label>
            <Select
              value={network}
              onValueChange={(value) => setNetwork(value as ClusterNetwork)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select network" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ClusterNetwork.Devnet}>Devnet</SelectItem>
                <SelectItem value={ClusterNetwork.Testnet}>Testnet</SelectItem>
                <SelectItem value={ClusterNetwork.Mainnet}>Mainnet</SelectItem>
                <SelectItem value={ClusterNetwork.Custom}>Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={hideModal}>
              Cancel
            </Button>
            <Button onClick={validateAndAdd}>
              Add Cluster
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ClusterUiTable() {
  const { clusters, setCluster, deleteCluster } = useCluster();
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Solana Clusters</h2>
        <Button onClick={() => setShowModal(true)}>
          Add Cluster
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Available Clusters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {clusters.map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-sm text-muted-foreground">{item.endpoint}</div>
                  </div>
                  {item.active && (
                    <Badge variant="default">Active</Badge>
                  )}
                </div>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant={item.active ? 'default' : 'outline'}
                    onClick={() => setCluster(item)}
                  >
                    {item.active ? 'Active' : 'Select'}
                  </Button>
                  {clusters.length > 1 && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this cluster?')) {
                          deleteCluster(item);
                        }
                      }}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <ClusterUiModal
        show={showModal}
        hideModal={() => setShowModal(false)}
      />
    </div>
  );
}
</forgeAction><forgeAction type="file" filePath="src/components/ui/select.tsx">"use client"

import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown, ChevronUp } from "lucide-react"

import { cn } from "@/lib/utils"

const Select = SelectPrimitive.Root

const SelectGroup = SelectPrimitive.Group

const SelectValue = SelectPrimitive.Value

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
))
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

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
))
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName

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
))
SelectScrollDownButton.displayName =
  SelectPrimitive.ScrollDownButton.displayName

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        "relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        position === "popper" &&
          "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
        className
      )}
      position={position}
      {...props}
    >
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        className={cn(
          "p-1",
          position === "popper" &&
            "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
))
SelectContent.displayName = SelectPrimitive.Content.displayName

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn("px-2 py-1.5 text-sm font-semibold", className)}
    {...props}
  />
))
SelectLabel.displayName = SelectPrimitive.Label.displayName

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
))
SelectItem.displayName = SelectPrimitive.Item.displayName

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props}
  />
))
SelectSeparator.displayName = SelectPrimitive.Separator.displayName

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
}
</forgeAction></forgeArtifact>`;