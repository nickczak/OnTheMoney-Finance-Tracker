import { NavLink, Outlet } from "react-router-dom";
import { Home, TrendingUp, User, Wallet } from "lucide-react";

import Logo from "@/components/ui/Logo";
import PageFrame from "@/components/ui/PageFrame";

const mobileTabs = [
  { to: "/", icon: Home, label: "Portfolio" },
  { to: "/accounts", icon: Wallet, label: "Accounts" },
  { to: "/stocks", icon: TrendingUp, label: "Stock Market" },
  { to: "/profile", icon: User, label: "Profile" },
];

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `font-display text-[24px] leading-none tracking-[0.02em] transition-colors max-[1180px]:text-[20px] ${
    isActive
      ? "text-brand border-b border-brand pb-0.5"
      : "text-primary/70 hover:text-primary"
  }`;

export default function TabLayout() {
  return (
    <div className="min-h-screen bg-bg text-primary">
      {/* OTM background plate, fitted under the header */}
      <div
        aria-hidden
        className="fixed inset-x-0 bottom-0 z-0 pointer-events-none bg-cover bg-center top-[140px] max-[560px]:top-[96px]"
        style={{
          backgroundImage: "url(/assets/otm-background.png)",
          opacity: 0.2,
        }}
      />

      {/* Fixed engraved plate frame */}
      <PageFrame />

      {/* ================= Topbar ================= */}
      <header className="sticky top-0 z-40 border-b border-[rgba(243,240,232,0.2)] bg-[rgba(4,4,4,0.92)] backdrop-blur-[14px]">
        <div className="mx-auto w-full max-w-[1720px] grid grid-cols-[1fr_320px_1fr] max-[1180px]:grid-cols-[1fr_240px_1fr] max-[900px]:grid-cols-[1fr_180px_1fr] max-[560px]:grid-cols-[1fr_150px_1fr] items-center gap-4 px-4 max-[560px]:px-3 h-[140px] max-[560px]:h-[96px]">
          {/* Left nav: first two tabs, close left of the logo */}
          <nav className="flex items-center gap-5 max-[1180px]:gap-4 justify-self-end max-[900px]:hidden">
            {mobileTabs.slice(0, 2).map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={navLinkClass}
              >
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Center: brand logo */}
          <NavLink
            to="/"
            aria-label="On The Money — Portfolio"
            className="col-start-2 justify-self-center flex items-center hover:opacity-90 transition-opacity"
          >
            <Logo className="h-[120px] max-[1180px]:h-[92px] max-[560px]:h-[68px]" />
          </NavLink>

          {/* Right nav: last two tabs, close right of the logo */}
          <div className="col-start-3 flex items-center justify-self-start max-[900px]:hidden">
            <nav className="flex items-center gap-5 max-[1180px]:gap-4">
              {mobileTabs.slice(2).map(({ to, label }) => (
                <NavLink key={to} to={to} className={navLinkClass}>
                  {label}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* ================= Mobile bottom dock ================= */}
      <nav className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] left-3 right-3 z-40 mx-auto max-w-[1100px] lg:hidden">
        <div className="rounded-[4px] px-1.5 py-1 bg-[#0e0e0e]/95 border border-[rgba(243,240,232,0.2)] shadow-[0_0_0_3px_#050505,0_0_0_4px_rgba(243,240,232,0.08),0_12px_40px_rgba(0,0,0,0.55)] flex">
          {mobileTabs.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[56px] rounded-[3px] transition-all active:scale-95 ${
                  isActive ? "text-brand" : "text-muted-2 hover:text-muted"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`flex items-center justify-center w-10 h-7 rounded-full transition-colors ${
                      isActive ? "bg-brand-dim" : ""
                    }`}
                  >
                    <Icon size={21} strokeWidth={isActive ? 2.4 : 2} />
                  </span>
                  <span className="text-[12px] font-display tracking-[0.06em] whitespace-nowrap leading-none">
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* ================= Wide shell ================= */}
      <main className="relative mx-auto w-full max-w-[1720px] px-5 md:px-8 pb-[calc(env(safe-area-inset-bottom,0px)+9rem)] lg:pb-16 mt-7 max-[560px]:mt-4">
        <div className="relative z-10 mx-auto w-full max-w-[1320px] min-w-0">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
