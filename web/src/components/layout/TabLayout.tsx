import { NavLink, Outlet } from "react-router-dom";
import { Home, TrendingUp, User, Wallet } from "lucide-react";

import Logo from "@/components/ui/Logo";
import { useAuth } from "@/lib/AuthContext";

const tabs = [
  { to: "/", icon: Home, label: "Portfolio" },
  { to: "/accounts", icon: Wallet, label: "Accounts" },
  { to: "/stocks", icon: TrendingUp, label: "Stocks" },
  { to: "/profile", icon: User, label: "Profile" },
];

export default function TabLayout() {
  const { user } = useAuth();
  const initials = user?.displayName
    ? user.displayName
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <div className="min-h-screen bg-bg text-primary">
      {/* Top app bar */}
      <header className="sticky top-0 z-40 border-b border-border/70 bg-bg/85 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-[1100px] flex items-center justify-between px-5 h-14">
          <NavLink to="/" aria-label="Home">
            <Logo />
          </NavLink>
          <NavLink
            to="/profile"
            aria-label="Profile"
            className="w-8 h-8 rounded-full bg-brand-dim border border-brand/30 flex items-center justify-center text-[12px] font-bold text-brand hover:border-brand/60 transition-colors"
          >
            {initials}
          </NavLink>
        </div>
      </header>

      <main className="pb-32">
        <Outlet />
      </main>

      {/* Bottom dock */}
      <nav className="fixed bottom-4 left-3 right-3 z-40 mx-auto max-w-[1100px]">
        <div className="rounded-2xl px-2 py-1.5 bg-[#0d1520]/92 border border-border-strong backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.02)_inset] flex justify-around">
          {tabs.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 rounded-xl px-5 py-1.5 transition-all ${
                  isActive ? "text-brand" : "text-muted-2 hover:text-muted"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`flex items-center justify-center w-9 h-6 rounded-full transition-colors ${
                      isActive ? "bg-brand-dim" : ""
                    }`}
                  >
                    <Icon size={21} strokeWidth={isActive ? 2.4 : 2} />
                  </span>
                  <span className="text-[10px] font-medium tracking-wide">
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
