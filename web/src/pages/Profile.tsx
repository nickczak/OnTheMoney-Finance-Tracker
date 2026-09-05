import { LogOut, ChevronRight, Mail } from "lucide-react";

import { useAuth } from "@/lib/AuthContext";
import { useResponsiveLayout } from "@/lib/responsive";
import Card from "@/components/ui/Card";

export default function Profile() {
  const { user, signOut } = useAuth();
  const { scale } = useResponsiveLayout();

  const initials = user?.displayName
    ? user.displayName
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <div className="min-h-full">
      <div className="pt-5 pb-8">
        <h1 className="font-display text-[32px] leading-none tracking-[0.02em] text-primary mb-5">
          Profile
        </h1>

        <Card className="p-6 flex flex-col items-center relative overflow-hidden">
          <div
            aria-hidden
            className="absolute -top-20 right-0 w-48 h-48 rounded-full bg-brand/10 blur-3xl"
          />
          <div className="relative">
            <img
              src="/assets/laurel.svg"
              alt=""
              className="absolute -inset-3.5 w-[108px] h-[108px] object-contain opacity-90 translate-x-[14px]"
            />
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-brand/30 to-info/20 border border-brand/40 flex items-center justify-center">
              <span
                className="font-bold text-brand"
                style={{ fontSize: 28 * scale }}
              >
                {initials}
              </span>
            </div>
          </div>
          <div
            className="relative font-bold text-primary text-center mt-4 tracking-tight"
            style={{ fontSize: 22 * scale }}
          >
            {user?.displayName ?? "User"}
          </div>
          <div
            className="relative text-muted mt-1.5 text-center flex items-center gap-1.5"
            style={{ fontSize: 13 * scale }}
          >
            <Mail size={14} className="text-muted" />
            {user?.email ?? ""}
          </div>
        </Card>

        <Card className="mt-5 overflow-hidden">
          <button
            type="button"
            onClick={() => void signOut()}
            className="flex flex-row items-center justify-between w-full py-4 px-4 hover:bg-surface-2 transition-colors"
          >
            <div className="flex flex-row items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-loss/10 border border-loss/20 flex items-center justify-center">
                <LogOut size={17} className="text-loss" />
              </div>
              <span className="font-medium text-loss">Log Out</span>
            </div>
            <ChevronRight size={16} className="text-muted-2" />
          </button>
        </Card>

        <div className="text-center text-[12px] text-muted-2 mt-8">
          On The Money · v1.0
        </div>
      </div>
    </div>
  );
}
