import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Zap } from "lucide-react"

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
      <Card className="border border-border/60 shadow-lg bg-card/70 backdrop-blur-sm">
        <CardHeader className="text-center space-y-4">
          <div
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-muted/30 border border-border/60 shadow-sm mx-auto"
            aria-hidden="true"
          >
            <Zap className="h-10 w-10 text-primary" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-3xl font-bold tracking-tight">Welcome to Sol-Dapper</CardTitle>
            <CardDescription className="text-base">
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
              <Zap className="mr-2 h-5 w-5" aria-hidden="true" />
              Sign in with Privy
            </Button>
          </div>
          <div className="text-center text-sm text-muted-foreground">
            Connect your wallet or sign in with email to begin creating innovative Solana applications
          </div>
        </CardContent>
      </Card>
      <div className="text-center text-xs text-balance text-muted-foreground">
        By clicking continue, you agree to our <a href="#" className="underline underline-offset-4 hover:text-primary">Terms of Service</a>{" "}
        and <a href="#" className="underline underline-offset-4 hover:text-primary">Privacy Policy</a>.
      </div>
    </div>
  )
}
