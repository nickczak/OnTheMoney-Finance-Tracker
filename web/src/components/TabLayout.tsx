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
    <div className="min-h-screen bg-black text-white">
      <main className="pb-20">
        <Outlet />
      </main>
      <nav className="fixed bottom-4 left-4 right-4 mx-auto max-w-[1100px] rounded-full border border-[#2c2c2e] bg-black/85 backdrop-blur flex justify-around px-2 py-2">
        {tabs.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 rounded-full px-4 py-1 ${
                isActive ? "text-brand" : "text-[#48484a] hover:text-[#98989d]"
              }`
            }
          >
            <Icon size={24} />
            <span className="font-serif text-xs">{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
