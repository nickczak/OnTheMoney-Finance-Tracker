import { useState } from "react";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Logo from "@/components/ui/Logo";
import { Field, Input } from "@/components/ui/Input";
import { useAuth } from "@/lib/AuthContext";
import { useResponsiveLayout } from "@/lib/responsive";

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const { scale } = useResponsiveLayout();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isSignup = mode === "signup";
  const canSubmit =
    email.trim() && password && (!isSignup || displayName.trim());

  async function handleSubmit() {
    if (busy || !canSubmit) return;
    setError(null);
    setBusy(true);
    try {
      if (isSignup) {
        await signUp(email.trim(), password, displayName.trim());
      } else {
        await signIn(email.trim(), password);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg overflow-hidden relative flex flex-col items-center justify-center p-6">
      {/* Ambient glows */}
      <div
        aria-hidden
        className="absolute -top-40 right-0 w-[480px] h-[420px] rounded-full bg-brand/10 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute bottom-0 -left-40 w-[420px] h-[380px] rounded-full bg-info/10 blur-3xl"
      />

      <div className="relative w-full max-w-[400px] flex flex-col items-center">
        <div className="mb-8 flex flex-col items-center">
          <Logo size={52} showWordmark={false} />
          <div
            className="font-bold tracking-tight text-primary mt-5"
            style={{ fontSize: 30 * scale }}
          >
            On The Money
          </div>
          <div className="text-muted text-[13px] mt-1.5">
            {isSignup
              ? "Create your account to get started"
              : "Welcome back. Sign in to your portfolio"}
          </div>
        </div>

        <Card className="w-full p-6">
          {isSignup && (
            <Field label="Display name" htmlFor="displayName">
              <Input
                id="displayName"
                placeholder="Jane Doe"
                autoComplete="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </Field>
          )}
          <Field label="Email" htmlFor="email">
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label="Password" htmlFor="password">
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              autoComplete={isSignup ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>

          {error && (
            <div className="text-[13px] text-loss text-center mb-3 mt-1">
              {error}
            </div>
          )}

          <Button
            variant="primary"
            size="lg"
            className="w-full mt-2"
            disabled={!canSubmit}
            onClick={() => void handleSubmit()}
          >
            {busy ? "Please wait…" : isSignup ? "Create account" : "Sign in"}
          </Button>
        </Card>

        <button
          type="button"
          onClick={() => {
            setMode(isSignup ? "login" : "signup");
            setError(null);
          }}
          className="mt-6 p-2 text-muted hover:text-brand transition-colors text-sm"
        >
          {isSignup
            ? "Already have an account? Sign in"
            : "Don't have an account? Create one"}
        </button>
      </div>
    </div>
  );
}
