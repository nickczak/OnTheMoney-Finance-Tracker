import { useState } from "react";
import { Loader2, User, Mail, Lock } from "lucide-react";

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

  async function handleSubmit() {
    if (busy) return;
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

  const inputRow =
    "flex flex-row items-center gap-3 border border-border rounded-xl bg-surface-alt py-2.5 px-3 max-w-[320px] mb-3";
  const input =
    "flex-1 bg-transparent text-text font-serif text-[15px] outline-none placeholder:text-muted";

  return (
    <div className="flex-1 min-h-screen bg-bg flex flex-col items-center justify-center p-6">
      <div className="flex flex-col items-center mb-8">
        <span className="w-14 h-14 rounded-2xl bg-brand flex items-center justify-center">
          <span className="font-serif font-bold text-white text-2xl">$</span>
        </span>
        <div
          className="font-serif font-bold text-text tracking-tight mt-3"
          style={{ fontSize: 34 * scale }}
        >
          On The Money
        </div>
      </div>

      <div className="w-full max-w-[360px] bg-surface border border-border rounded-2xl shadow-sm p-6">
        <div className="font-serif text-[13px] text-muted uppercase tracking-widest text-center mb-5">
          {isSignup ? "Create your account" : "Welcome back"}
        </div>
        {isSignup && (
          <div className={inputRow}>
            <User size={20} color="#64748b" />
            <input
              className={input}
              placeholder="Display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
        )}
        <div className={inputRow}>
          <Mail size={20} color="#64748b" />
          <input
            className={input}
            placeholder="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className={inputRow}>
          <Lock size={20} color="#64748b" />
          <input
            className={input}
            placeholder="Password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && (
          <div
            className="font-serif text-danger text-center mb-2"
            style={{ fontSize: 13 * scale }}
          >
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={busy || !email || !password || (isSignup && !displayName)}
          className={`w-full bg-brand text-white rounded-xl py-3 mt-1 flex items-center justify-center transition-colors ${
            busy || !email || !password || (isSignup && !displayName)
              ? "opacity-50"
              : "hover:bg-brand-hover"
          }`}
        >
          {busy ? (
            <Loader2 className="animate-spin" color="#fff" />
          ) : (
            <span
              className="font-serif font-semibold text-white tracking-wide"
              style={{ fontSize: 16 * scale }}
            >
              {isSignup ? "Create account" : "Sign in"}
            </span>
          )}
        </button>
      </div>

      <button
        type="button"
        onClick={() => setMode(isSignup ? "login" : "signup")}
        className="mt-6 p-2"
      >
        <span
          className="font-serif text-brand text-center font-medium"
          style={{ fontSize: 14 * scale }}
        >
          {isSignup
            ? "Already have an account? Sign in"
            : "Don't have an account? Create one"}
        </span>
      </button>
    </div>
  );
}
