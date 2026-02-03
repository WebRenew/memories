import Link from "next/link"
import Image from "next/image"
import { OAuthButtons } from "./oauth-buttons"

export const metadata = {
  title: "Sign In",
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
      <div className="memory-lattice" />

      <div className="w-full max-w-sm">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 justify-center mb-12 group">
          <Image
            src="/memories.svg"
            alt="memories.sh logo"
            width={32}
            height={32}
            className="w-8 h-8 dark:invert group-hover:scale-110 transition-transform duration-500"
          />
          <span className="font-mono text-sm font-bold tracking-tighter uppercase text-foreground">
            memories.sh
          </span>
        </Link>

        {/* Card */}
        <div className="border border-border bg-card/20 p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold tracking-tight mb-2">Sign In</h1>
            <p className="text-sm text-muted-foreground italic">
              Access your memory dashboard
            </p>
          </div>

          <OAuthButtons />

          <p className="text-[10px] text-muted-foreground/60 text-center mt-8 leading-relaxed">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>

        <div className="text-center mt-6">
          <Link
            href="/"
            className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground/60 hover:text-foreground transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
