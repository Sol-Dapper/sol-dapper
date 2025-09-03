"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AIResponseRenderer } from './AIResponseRenderer'

const SAMPLE_FORGE_RESPONSE_1 = `I'll create a simple Solana wallet connection dApp using Next.js and Anchor.

<forgeArtifact id="solana-wallet-dapp" title="Solana Wallet Connection dApp">
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

  <forgeAction type="file" filePath="src/app/page.tsx">
import WalletInfo from '@/components/WalletInfo';

export default function Home() {
  return (
    <main className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Solana Wallet Demo</h1>
      <WalletInfo />
    </main>
  );
}
  </forgeAction>

  <forgeAction type="file" filePath="package.json">
{
  "name": "wallet-connect-app",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "@solana/wallet-adapter-base": "^0.9.23",
    "@solana/wallet-adapter-react": "^0.15.32",
    "@solana/wallet-adapter-react-ui": "^0.9.31",
    "@solana/wallet-adapter-wallets": "^0.19.16",
    "@solana/web3.js": "^1.78.0",
    "next": "13.4.19",
    "react": "18.2.0",
    "react-dom": "18.2.0"
  },
  "devDependencies": {
    "@types/node": "20.5.0",
    "@types/react": "18.2.20",
    "@types/react-dom": "18.2.7",
    "typescript": "5.1.6"
  }
}
  </forgeAction>

  <forgeAction type="shell">
    npm run dev
  </forgeAction>
</forgeArtifact>

This creates a complete Solana wallet connection dApp with:
- Wallet adapter setup
- Balance display component
- Next.js configuration
- All necessary dependencies`

const SAMPLE_FORGE_RESPONSE_2 = `Here's a Solana NFT marketplace with advanced features:

<forgeArtifact id="solana-nft-marketplace" title="Solana NFT Marketplace">
  <forgeAction type="shell">
    npx create-solana-dapp@latest nft-marketplace --template nextjs --yes
  </forgeAction>

  <forgeAction type="file" filePath="src/lib/nft.ts">
import { PublicKey, Connection } from '@solana/web3.js';
import { Metaplex, keypairIdentity } from '@metaplex-foundation/js';

export interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  attributes: Array<{
    trait_type: string;
    value: string;
  }>;
}

export class NFTService {
  private metaplex: Metaplex;

  constructor(connection: Connection) {
    this.metaplex = Metaplex.make(connection);
  }

  async getNFTMetadata(mintAddress: PublicKey): Promise<NFTMetadata | null> {
    try {
      const nft = await this.metaplex.nfts().findByMint({ mintAddress });
      
      if (nft.jsonLoaded) {
        return {
          name: nft.name,
          description: nft.json?.description || '',
          image: nft.json?.image || '',
          attributes: nft.json?.attributes || [],
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching NFT metadata:', error);
      return null;
    }
  }

  async getUserNFTs(walletAddress: PublicKey): Promise<any[]> {
    try {
      const nfts = await this.metaplex
        .nfts()
        .findAllByOwner({ owner: walletAddress });
      
      return nfts;
    } catch (error) {
      console.error('Error fetching user NFTs:', error);
      return [];
    }
  }
}
  </forgeAction>

  <forgeAction type="file" filePath="src/components/NFTCard.tsx">
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

interface NFTCardProps {
  nft: {
    name: string;
    image: string;
    description: string;
    price?: number;
    attributes: Array<{
      trait_type: string;
      value: string;
    }>;
  };
  onBuy?: () => void;
}

export function NFTCard({ nft, onBuy }: NFTCardProps) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="aspect-square relative">
        <Image
          src={nft.image}
          alt={nft.name}
          fill
          className="object-cover"
        />
      </div>
      
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{nft.name}</CardTitle>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {nft.description}
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {nft.attributes.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {nft.attributes.slice(0, 3).map((attr, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {attr.trait_type}: {attr.value}
              </Badge>
            ))}
          </div>
        )}
        
        {nft.price && (
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold">{nft.price} SOL</span>
            <Button onClick={onBuy} size="sm">
              Buy Now
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
  </forgeAction>

  <forgeAction type="file" filePath="anchor/programs/marketplace/src/lib.rs">
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("MarketplaceProgram111111111111111111111");

#[program]
pub mod marketplace {
    use super::*;

    pub fn initialize_marketplace(
        ctx: Context<InitializeMarketplace>,
        fee_basis_points: u16,
    ) -> Result<()> {
        let marketplace = &mut ctx.accounts.marketplace;
        marketplace.authority = ctx.accounts.authority.key();
        marketplace.fee_basis_points = fee_basis_points;
        marketplace.bump = *ctx.bumps.get("marketplace").unwrap();
        
        msg!("Marketplace initialized with {}% fee", fee_basis_points as f64 / 100.0);
        Ok(())
    }

    pub fn list_nft(
        ctx: Context<ListNFT>,
        price: u64,
    ) -> Result<()> {
        let listing = &mut ctx.accounts.listing;
        listing.seller = ctx.accounts.seller.key();
        listing.nft_mint = ctx.accounts.nft_mint.key();
        listing.price = price;
        listing.is_active = true;
        listing.bump = *ctx.bumps.get("listing").unwrap();
        
        // Transfer NFT to escrow
        let cpi_accounts = Transfer {
            from: ctx.accounts.seller_nft_account.to_account_info(),
            to: ctx.accounts.escrow_nft_account.to_account_info(),
            authority: ctx.accounts.seller.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, 1)?;
        
        msg!("NFT listed for {} lamports", price);
        Ok(())
    }

    pub fn buy_nft(ctx: Context<BuyNFT>) -> Result<()> {
        let listing = &mut ctx.accounts.listing;
        require!(listing.is_active, MarketplaceError::ListingNotActive);
        
        let price = listing.price;
        let marketplace_fee = (price * ctx.accounts.marketplace.fee_basis_points as u64) / 10000;
        let seller_proceeds = price - marketplace_fee;
        
        // Transfer SOL to seller
        **ctx.accounts.buyer.to_account_info().try_borrow_mut_lamports()? -= seller_proceeds;
        **ctx.accounts.seller.to_account_info().try_borrow_mut_lamports()? += seller_proceeds;
        
        // Transfer marketplace fee
        **ctx.accounts.buyer.to_account_info().try_borrow_mut_lamports()? -= marketplace_fee;
        **ctx.accounts.marketplace_authority.to_account_info().try_borrow_mut_lamports()? += marketplace_fee;
        
        // Transfer NFT to buyer
        let seeds = &[
            b"listing",
            listing.nft_mint.as_ref(),
            &[listing.bump],
        ];
        let signer = &[&seeds[..]];
        
        let cpi_accounts = Transfer {
            from: ctx.accounts.escrow_nft_account.to_account_info(),
            to: ctx.accounts.buyer_nft_account.to_account_info(),
            authority: listing.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, 1)?;
        
        listing.is_active = false;
        
        msg!("NFT sold for {} lamports", price);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeMarketplace<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 2 + 1,
        seeds = [b"marketplace"],
        bump
    )]
    pub marketplace: Account<'info, Marketplace>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ListNFT<'info> {
    #[account(
        init,
        payer = seller,
        space = 8 + 32 + 32 + 8 + 1 + 1,
        seeds = [b"listing", nft_mint.key().as_ref()],
        bump
    )]
    pub listing: Account<'info, Listing>,
    
    pub marketplace: Account<'info, Marketplace>,
    
    #[account(mut)]
    pub seller: Signer<'info>,
    
    pub nft_mint: Account<'info, token::Mint>,
    
    #[account(mut)]
    pub seller_nft_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub escrow_nft_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct Marketplace {
    pub authority: Pubkey,
    pub fee_basis_points: u16,
    pub bump: u8,
}

#[account]
pub struct Listing {
    pub seller: Pubkey,
    pub nft_mint: Pubkey,
    pub price: u64,
    pub is_active: bool,
    pub bump: u8,
}

#[error_code]
pub enum MarketplaceError {
    #[msg("Listing is not active")]
    ListingNotActive,
}
  </forgeAction>

  <forgeAction type="shell">
    cd nft-marketplace && npm install @metaplex-foundation/js
  </forgeAction>

  <forgeAction type="shell">
    anchor build
  </forgeAction>

  <forgeAction type="shell">
    npm run dev
  </forgeAction>
</forgeArtifact>

This NFT marketplace includes:
- Complete marketplace smart contract in Rust
- TypeScript SDK for NFT operations
- React components for NFT display
- Metaplex integration for metadata
- Fee collection and escrow system`

export function ForgeParserDemo() {
  const [activeDemo, setActiveDemo] = useState<string | null>(null)

  const demos = [
    {
      id: 'wallet-dapp',
      title: 'Solana Wallet Connection dApp',
      description: 'Basic wallet integration with balance display',
      response: SAMPLE_FORGE_RESPONSE_1
    },
    {
      id: 'nft-marketplace',
      title: 'NFT Marketplace with Smart Contract',
      description: 'Complete marketplace with Rust program and React frontend',
      response: SAMPLE_FORGE_RESPONSE_2
    }
  ]

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Monaco Editor & File Structure Demo</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-6">
            This demonstrates how the XML parser handles Forge AI responses with forgeArtifact tags,
            file actions, and shell commands. Choose a demo below to see the interactive file tree
            and Monaco editor in action.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {demos.map((demo) => (
              <Card key={demo.id} className="cursor-pointer hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg">{demo.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">{demo.description}</p>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={() => setActiveDemo(activeDemo === demo.id ? null : demo.id)}
                    variant={activeDemo === demo.id ? "secondary" : "default"}
                    className="w-full"
                  >
                    {activeDemo === demo.id ? 'Hide Demo' : 'Show Demo'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {activeDemo && (
        <div className="border rounded-lg p-6 bg-card">
          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-2">
              {demos.find(d => d.id === activeDemo)?.title}
            </h3>
            <p className="text-muted-foreground">
              Parsed AI response showing file tree, Monaco editor, and shell commands:
            </p>
          </div>
          <AIResponseRenderer 
            response={demos.find(d => d.id === activeDemo)?.response || ''} 
          />
        </div>
      )}
    </div>
  )
} 