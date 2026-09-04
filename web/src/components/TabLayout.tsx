import { NavLink, Outlet } from "react-router-dom";
import { Home, TrendingUp, User, Wallet } from "lucide-react";

const tabs = [
  { to: "/", icon: Home, label: "Portfolio" },
  { to: "/accounts", icon: Wallet, label: "Accounts" },
  { to: "/stocks", icon: TrendingUp, label: "Stocks" },
  { to: "/profile", icon: User, label: "Profile" },
];

export default function TabLayout() {
  return (
    <div className="min-h-screen bg-bg text-primary">
      <main className="pb-28">
        <Outlet />
      </main>
      <nav className="fixed bottom-4 left-4 right-4 mx-auto max-w-[1100px] rounded-2xl border border-[#1f3a4a] bg-[#0a1622]/95 backdrop-blur-xl flex justify-around px-2 py-1.5 shadow-[0_8px_32px_rgba(0,10,20,0.35)]">
        {tabs.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 rounded-xl px-5 py-2 transition-colors ${
                isActive
                  ? "bg-[#46beec]/15 text-[#46beec]"
                  : "text-[#6a8392] hover:text-[#9db2bf]"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                <span className="font-serif text-[10px] tracking-wider">
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
