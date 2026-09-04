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
    "flex flex-row items-center gap-3 border-b border-[#3a3a3c] py-2.5 px-3 max-w-[320px]";
  const input =
    "flex-1 bg-black text-white font-serif text-lg outline-none placeholder:text-[#98989d]";

  return (
    <div className="flex-1 min-h-screen bg-black flex flex-col items-center justify-center p-6">
      <div
        className="font-serif font-bold text-white tracking-wide"
        style={{ fontSize: 40 * scale }}
      >
        On The Money
      </div>
      <div
        className="font-serif text-[#98989d] uppercase tracking-widest mt-2 mb-8"
        style={{ fontSize: 12 * scale }}
      >
        {isSignup ? "Create your account" : "Welcome back"}
      </div>

      <div className="w-full max-w-[360px] bg-black border border-white p-6">
        {isSignup && (
          <div className={inputRow}>
            <User size={24} color="#98989d" />
            <input
              className={input}
              placeholder="Display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
        )}
        <div className={inputRow}>
          <Mail size={24} color="#98989d" />
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
          <Lock size={24} color="#98989d" />
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
            className="font-serif text-danger text-center"
            style={{ fontSize: 13 * scale }}
          >
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={busy || !email || !password || (isSignup && !displayName)}
          className={`w-full border border-white py-3 mt-2 flex items-center justify-center transition-colors ${
            busy || !email || !password || (isSignup && !displayName)
              ? "opacity-40"
              : "hover:bg-[#1a1a1a]"
          }`}
        >
          {busy ? (
            <Loader2 className="animate-spin" color="#fff" />
          ) : (
            <span
              className="font-serif font-bold text-white tracking-wide"
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
          className="font-serif text-brand text-center"
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
