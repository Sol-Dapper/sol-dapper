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
</forgeAction>`;
