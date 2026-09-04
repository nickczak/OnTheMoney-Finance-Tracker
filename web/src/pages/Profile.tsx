import { LogOut, ChevronRight } from "lucide-react";

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
    <div className="min-h-full bg-black">
      <div
        className={`flex-1 p-4 pb-20 ${isDesktop ? "max-w-[1100px] mx-auto px-6" : ""}`}
      >
        <div className="flex flex-col items-center py-8">
          <div className="w-20 h-20 rounded-full bg-[#2c2c2e] flex items-center justify-center border border-[#48484a]">
            <span className="font-serif text-[30px] font-bold text-white">
              {initials}
            </span>
          </div>
          <div
            className="font-serif font-bold text-white text-center mt-4"
            style={{ fontSize: 22 * scale }}
          >
            {user?.displayName ?? "User"}
          </div>
          <div
            className="font-serif text-[#98989d] mt-1 text-center"
            style={{ fontSize: 13 * scale }}
          >
            {user?.email ?? ""}
          </div>
        </div>

        <div className="mt-6 border border-[#2c2c2e]">
          <button
            type="button"
            onClick={() => void signOut()}
            className="flex flex-row items-center justify-between w-full py-3.5 px-4 border-b border-[#2c2c2e] hover:bg-[#1a1a1a]"
          >
            <div className="flex flex-row items-center gap-3">
              <LogOut size={20} color="#ff6b6b" />
              <span className="font-serif text-base text-danger">Log Out</span>
            </div>
            <ChevronRight size={16} color="#48484a" />
          </button>
        </div>
      </div>
    </div>
  );
}
