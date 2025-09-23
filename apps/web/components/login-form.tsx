import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import Image from "next/image"

interface LoginFormProps extends React.ComponentProps<"div"> {
  onLogin: () => void
}

export function LoginForm({
  className,
  onLogin,
  ...props
}: LoginFormProps) {
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="border border-border/60 shadow-lg bg-card/80 backdrop-blur-md">
        <CardHeader className="text-center space-y-4">
          <div
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-muted/30 border border-border/60 shadow-sm mx-auto overflow-hidden"
            aria-hidden="true"
          >
            <Image 
              src="/dapperGithub.jpg" 
              alt="Sol-Dapper Logo" 
              width={80} 
              height={80} 
              className="object-cover rounded-2xl" 
            />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-3xl font-bold tracking-tight drop-shadow-sm">Welcome to Sol-Dapper</CardTitle>
            <CardDescription className="text-base drop-shadow-sm">
              Build powerful Solana applications with AI assistance in minutes
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <Button
              onClick={onLogin}
              size="lg"
              className="w-full h-12 text-base font-medium transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
              aria-label="Sign in with Privy"
            >
              <Image 
                src="/dapperGithub.jpg" 
                alt="Sol-Dapper" 
                width={20} 
                height={20} 
                className="mr-2 rounded-sm object-cover" 
                aria-hidden="true" 
              />
              Sign in with Privy
            </Button>
          </div>
          <div className="text-center text-sm text-muted-foreground drop-shadow-sm">
            Connect your wallet or sign in with email to begin creating innovative Solana applications
          </div>
        </CardContent>
      </Card>
      <div className="text-center text-xs text-balance text-muted-foreground drop-shadow-sm">
        By clicking continue, you agree to our <a href="#" className="underline underline-offset-4 hover:text-primary">Terms of Service</a>{" "}
        and <a href="#" className="underline underline-offset-4 hover:text-primary">Privacy Policy</a>.
      </div>
    </div>
  )
}
