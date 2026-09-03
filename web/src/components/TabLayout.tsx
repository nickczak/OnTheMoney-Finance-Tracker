import { NavLink, Outlet } from "react-router-dom";
import { FileText, Lock, TrendingUp, User } from "lucide-react";

const tabs = [
  { to: "/", icon: FileText, label: "Portfolio" },
  { to: "/accounts", icon: Lock, label: "Accounts" },
  { to: "/stocks", icon: TrendingUp, label: "Stocks" },
  { to: "/profile", icon: User, label: "Profile" },
];

export default function TabLayout() {
  return (
    <div className="min-h-full bg-bg text-text">
      <header className="bg-surface border-b border-border sticky top-0 z-20">
        <div className="mx-auto w-full max-w-[1100px] px-6 h-16 flex items-center justify-between">
          <NavLink to="/" className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center">
              <span className="font-serif font-bold text-white text-sm">$</span>
            </span>
            <span className="font-serif font-bold text-[17px] tracking-tight">
              On The Money
            </span>
          </NavLink>
          <nav className="flex items-center gap-1">
            {tabs.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors ${
                    isActive
                      ? "bg-brand text-white"
                      : "text-muted hover:bg-surface-hover hover:text-text"
                  }`
                }
              >
                <Icon size={17} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="pb-16">
        <Outlet />
      </main>
    </div>
  );
}
