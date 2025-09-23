# Sol-Dapper 🚀

> A v0-like platform for generating and running Solana applications instantly in the browser.

Sol-Dapper is an AI-powered development platform that generates complete Solana applications from natural language prompts and runs them instantly using WebContainer technology - no deployment delays, no complex setup.

## ✨ Features

- 🤖 **AI-Powered Generation**: Create complete Solana dApps from natural language descriptions
- ⚡ **Instant Preview**: Run generated applications immediately in the browser using WebContainer
- 🔐 **Privy Authentication**: Seamless wallet integration with Solana and Ethereum support
- 📁 **Project Management**: Save, organize, and iterate on your generated projects
- 🌐 **Real-time Streaming**: Watch your code being generated in real-time with live status updates
- 🎯 **File Management**: Interactive file tree with syntax highlighting and editing capabilities
- 📱 **Responsive Design**: Beautiful, modern UI built with TailwindCSS and Shadcn/UI

## 🏗️ Architecture

This is a [Turborepo](https://turborepo.com) monorepo with the following structure:

### 📱 Apps

- **`web`** - Next.js 15 frontend application with React 19
  - WebContainer integration for in-browser app execution
  - Privy authentication and wallet management
  - AI response streaming and project management UI
  - Monaco Editor for code editing with syntax highlighting

- **`backend`** - Express.js API server
  - AI-powered code generation using OpenAI/Anthropic
  - Project and user management endpoints
  - Streaming responses with real-time status updates
  - Authentication and authorization middleware

### 📦 Packages

- **`db`** - Prisma database client and schema
  - PostgreSQL database with User, Project, and Prompt models
  - Prisma migrations and type-safe database access

- **`ui`** - Shared React component library
  - Reusable UI components built with Radix UI primitives
  - Consistent design system across applications

- **`eslint-config`** - Shared ESLint configurations
- **`typescript-config`** - Shared TypeScript configurations

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh) >= 1.0.0
- [PostgreSQL](https://postgresql.org) database
- OpenAI or Anthropic API key
- Privy account for authentication

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd sol-dapper
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Set up environment variables**

   **Backend** (`apps/backend/.env`):
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/sol-dapper"
   OPENAI_API_KEY="your-openai-api-key"
   # OR
   ANTHROPIC_API_KEY="your-anthropic-api-key"
   JWT_SECRET="your-jwt-secret"
   NODE_ENV="development"
   ```

   **Web** (`apps/web/.env.local`):
   ```env
   NEXT_PUBLIC_PRIVY_APP_ID="your-privy-app-id"
   NEXT_PUBLIC_PRIVY_CLIENT_ID="your-privy-client-id"
   NEXT_PUBLIC_API_URL="http://localhost:8000"
   ```

4. **Set up the database**
   ```bash
   cd packages/db
   bunx prisma migrate dev
   bunx prisma generate
   ```

5. **Start development servers**
   ```bash
   # Start all apps in development mode
   bun dev

   # Or start individually
   bun dev --filter=web      # Frontend only
   bun dev --filter=backend  # Backend only
   ```

6. **Open your browser**
   - Frontend: http://localhost:3000
   - Backend: http://localhost:8000

## 🛠️ Available Scripts

```bash
# Development
bun dev                    # Start all apps in development mode
bun dev --filter=web      # Start only frontend
bun dev --filter=backend  # Start only backend

# Building
bun build                 # Build all apps and packages
bun build --filter=web    # Build only frontend
bun build --filter=backend # Build only backend

# Code Quality
bun lint                  # Lint all packages
bun format               # Format code with Prettier
bun check-types          # Type check all TypeScript files

# Database
cd packages/db
bunx prisma studio       # Open Prisma Studio
bunx prisma migrate dev  # Run database migrations
bunx prisma generate     # Generate Prisma client
```

## 🎯 Usage

1. **Create Account**: Sign up using your email or connect a Solana/Ethereum wallet
2. **Generate App**: Describe your Solana application in natural language
3. **Watch Magic**: See your code being generated in real-time with live streaming
4. **Instant Preview**: Your app runs immediately in the browser - no deployment needed
5. **Edit & Iterate**: Use the built-in Monaco editor to modify your generated code
6. **Navigate**: Use the browser-like address bar to explore different routes in your app

### Example Prompts

- "Create a Solana token swap dApp with a modern UI"
- "Build a Solana NFT minting platform with wallet integration"
- "Generate a Solana staking dashboard with rewards tracking"
- "Create a simple Solana wallet interface with send/receive functionality"

## 🔧 Technology Stack

### Frontend
- **Framework**: Next.js 15 with App Router
- **Runtime**: React 19
- **Styling**: TailwindCSS + Shadcn/UI components
- **State Management**: React Context
- **Authentication**: Privy (Solana + Ethereum wallets)
- **Code Editor**: Monaco Editor
- **WebContainer**: In-browser Node.js runtime

### Backend
- **Runtime**: Node.js with Express.js
- **AI**: OpenAI GPT-4o / Anthropic Claude with AI SDK v4
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with Privy integration
- **Streaming**: Server-Sent Events with real-time updates

### Development
- **Monorepo**: Turborepo
- **Package Manager**: Bun
- **Language**: TypeScript throughout
- **Linting**: ESLint + Prettier
- **Deployment**: Vercel (Frontend + Backend)

## 📊 Database Schema

```prisma
model User {
  id            String    @id @default(uuid())
  email         String?   @unique
  privyUserId   String    @unique
  walletAddress String?
  projects      Project[]
}

model Project {
  id          String   @id @default(uuid())
  description String
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  prompts     Prompt[]
}

model Prompt {
  id        String     @id @default(uuid())
  content   String
  type      PromptType // USER | SYSTEM
  projectId String
  project   Project    @relation(fields: [projectId], references: [id])
}
```

## 🚀 Deployment

Sol-Dapper is configured for deployment on Vercel with separate projects for frontend and backend.

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [WebContainer API](https://webcontainer.dev) for in-browser Node.js runtime
- [Privy](https://privy.io) for seamless Web3 authentication
- [Vercel AI SDK](https://sdk.vercel.ai) for streaming AI responses
- [Turborepo](https://turborepo.com) for monorepo management
- [Shadcn/UI](https://ui.shadcn.com) for beautiful React components

---

<p align="center">
  <strong>Built with ❤️ for the Solana developer ecosystem</strong>
</p>
