import { LogOut, ChevronRight, Mail } from "lucide-react";

import { useResponsiveLayout } from "@/lib/responsive";
import { useAuth } from "@/lib/AuthContext";

export default function Profile() {
  const { user, signOut } = useAuth();
  const { scale, isDesktop } = useResponsiveLayout();

  const initials = user?.displayName
    ? user.displayName
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <div className="min-h-full bg-bg">
      <div
        className={`flex-1 p-5 pb-20 ${isDesktop ? "max-w-[1100px] mx-auto px-8" : ""}`}
      >
        <div className="font-serif text-2xl font-bold text-primary mb-6">
          Profile
        </div>

        <div className="bg-surface border border-border rounded-xl p-6 flex flex-col items-center shadow-sm">
          <div className="w-20 h-20 rounded-full bg-[#eaf2f6] flex items-center justify-center border border-[#c8e1ec]">
            <span className="font-serif text-[30px] font-bold text-[#0078a8]">
              {initials}
            </span>
          </div>
          <div
            className="font-serif font-bold text-primary text-center mt-4"
            style={{ fontSize: 22 * scale }}
          >
            {user?.displayName ?? "User"}
          </div>
          <div
            className="font-serif text-muted mt-1 text-center flex items-center gap-1.5"
            style={{ fontSize: 13 * scale }}
          >
            <Mail size={14} className="text-muted" />
            {user?.email ?? ""}
          </div>
        </div>

        <div className="mt-6 bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
          <button
            type="button"
            onClick={() => void signOut()}
            className="flex flex-row items-center justify-between w-full py-4 px-4 hover:bg-surface-2 transition-colors"
          >
            <div className="flex flex-row items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#f7e9e8] flex items-center justify-center">
                <LogOut size={18} color="#c8443d" />
              </div>
              <span className="font-serif text-base text-loss">Log Out</span>
            </div>
            <ChevronRight size={16} className="text-[#8597a0]" />
          </button>
        </div>
      </div>
    </div>
  );
}
