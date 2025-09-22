// Additional boilerplate components to extend the base prompt
export const boilerplateComponents = `<forgeAction type="file" filePath="src/components/app-footer.tsx">export function AppFooter() {
  return (
    <footer className="border-t py-8 mt-16">
      <div className="container mx-auto px-4 text-center text-muted-foreground">
        <p>&copy; 2024 Solana DApp. Built with Next.js and Anchor.</p>
      </div>
    </footer>
  );
}
</forgeAction>

<forgeAction type="file" filePath="src/components/solana/wallet-button.tsx">import { useWallet } from '@solana/wallet-adapter-react';
import { Button } from '../ui/button';

export function WalletButton() {
  const { wallet, connect, connecting, connected, disconnect } = useWallet();

  return (
    <Button
      onClick={connected ? disconnect : connect}
      disabled={connecting}
      variant={connected ? 'secondary' : 'default'}
    >
      {connecting
        ? 'Connecting...'
        : connected
        ? \`Disconnect \${wallet?.adapter.name}\`
        : 'Connect Wallet'
      }
    </Button>
  );
}
</forgeAction>

<forgeAction type="file" filePath="src/components/cluster/cluster-data-access.tsx">'use client';

import { clusterApiUrl } from '@solana/web3.js';
import { atom, useAtomValue, useSetAtom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

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

const clusterAtom = atomWithStorage<Cluster>('solana-cluster', defaultClusters[0]);
const clustersAtom = atomWithStorage<Cluster[]>('solana-clusters', defaultClusters);

const activeClustersAtom = atom<Cluster[]>((get) => {
  const clusters = get(clustersAtom);
  const cluster = get(clusterAtom);
  return clusters.map((item) => ({ ...item, active: item.name === cluster.name }));
});

const activeClusterAtom = atom<Cluster>((get) => {
  const clusters = get(activeClustersAtom);
  return clusters.find((item) => item.active) || clusters[0];
});

export function useCluster() {
  return {
    cluster: useAtomValue(activeClusterAtom),
    clusters: useAtomValue(activeClustersAtom),
    addCluster: useSetAtom(addClusterAtom),
    deleteCluster: useSetAtom(deleteClusterAtom),
    setCluster: useSetAtom(setClusterAtom),
  };
}

const addClusterAtom = atom(null, (get, set, cluster: Cluster) => {
  const clusters = get(clustersAtom);
  set(clustersAtom, [...clusters, cluster]);
});

const deleteClusterAtom = atom(null, (get, set, cluster: Cluster) => {
  const clusters = get(clustersAtom);
  set(clustersAtom, clusters.filter((item) => item.name !== cluster.name));
});

const setClusterAtom = atom(null, (get, set, cluster: Cluster) => {
  set(clusterAtom, cluster);
});
</forgeAction>

<forgeAction type="file" filePath="src/components/cluster/cluster-ui.tsx">'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useCluster } from './cluster-data-access';

export function ClusterUiSelect() {
  const { clusters, setCluster, cluster } = useCluster();

  return (
    <Select
      value={cluster?.name}
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
            {item.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
</forgeAction>

<forgeAction type="file" filePath="src/components/theme-select.tsx">'use client';

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
</forgeAction>

<forgeAction type="file" filePath="src/lib/utils.ts">import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
</forgeAction>

<forgeAction type="file" filePath="src/components/ui/sonner.tsx">"use client"

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
</forgeAction>

<forgeAction type="file" filePath="src/components/ui/button.tsx">import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

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
</forgeAction>

<forgeAction type="file" filePath="src/components/ui/card.tsx">import * as React from "react"

import { cn } from "@/lib/utils"

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
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

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
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
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
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
</forgeAction>

<forgeAction type="file" filePath="src/components/ui/select.tsx">"use client"

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
    className={cn("py-1.5 pl-8 pr-2 text-sm font-semibold", className)}
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
      "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
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
</forgeAction>`;
