import { useNavigate } from "react-router-dom";
import { forwardRef, useState } from "react";
import { ChevronRight } from "lucide-react";

import AccountIcon, { type AccountType } from "./AccountIcon";
import { useResponsiveLayout } from "@/lib/responsive";
import { formatMoney } from "@/lib/format";
import type { Account } from "@/types/Account";

const TYPE_LABEL: Record<AccountType, string> = {
  CHECKING: "Checking",
  SAVINGS: "Savings",
  CREDIT_CARD: "Credit card",
  LOAN: "Loan",
  INVESTMENT: "Investment",
};

const AccountCard = forwardRef<
  HTMLButtonElement,
  {
    account: Account;
    percent?: number;
    tileWidth?: number;
    className?: string;
  }
>(function AccountCard({ account, percent, tileWidth, className = "" }, ref) {
  const navigate = useNavigate();
  const { scale, width } = useResponsiveLayout();
  const [hovered, setHovered] = useState(false);

  const isDebt =
    account.accType === "CREDIT_CARD" || account.accType === "LOAN";

  // Small informational tile (used in the Portfolio account-mix breakdown).
  if (percent !== undefined) {
    const cardWidth = tileWidth ?? (width - 2 * 20 - 12 - 2 * 4) / 3;
    return (
      <div
        className="rounded-2xl bg-surface border border-border flex flex-col items-center justify-center p-3 m-1 shadow-[0_8px_24px_rgba(0,0,0,0.25)]"
        style={{ width: cardWidth, height: cardWidth }}
      >
        <div
          className={`text-[10px] uppercase tracking-[0.14em] font-semibold ${
            isDebt ? "text-loss" : "text-gain"
          }`}
        >
          {isDebt ? "Liability" : "Asset"}
        </div>
        <AccountIcon accType={account.accType} size={26} />
        <div className="text-[13px] font-medium text-primary truncate w-full text-center mt-1">
          {account.name}
        </div>
        <div className="text-[19px] font-bold text-primary tabular-nums">
          {(percent * 100).toFixed(1)}%
        </div>
      </div>
    );
  }

  return (
    <button
      ref={ref}
      type="button"
      onClick={() => navigate(`/account/${account.id}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`group w-full text-left rounded-2xl bg-surface border p-4 my-1.5 transition-all shadow-[0_8px_24px_rgba(0,0,0,0.25)] ${
        hovered
          ? "border-brand/40 bg-surface-2 translate-y-[-1px] shadow-[0_12px_32px_rgba(0,0,0,0.35)]"
          : "border-border"
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="w-11 h-11 rounded-xl bg-bg-2 border border-border flex items-center justify-center shrink-0 group-hover:border-brand/30 transition-colors">
          <AccountIcon accType={account.accType} size={22} />
        </div>

        <div className="flex-1 min-w-0">
          <div
            className="text-primary font-semibold truncate tracking-tight"
            style={{ fontSize: 17 * scale }}
          >
            {account.name}
          </div>
          <div className="text-[11px] uppercase tracking-[0.12em] text-muted mt-0.5">
            {TYPE_LABEL[account.accType]}
          </div>
        </div>

        <div
          className={`flex items-center gap-1.5 flex-shrink max-w-[45%] ${
            isDebt ? "text-loss" : ""
          }`}
        >
          <span
            className="font-bold flex-shrink truncate tabular-nums tracking-tight"
            style={{ fontSize: 24 * scale }}
          >
            ${formatMoney(account.balance)}
          </span>
          <ChevronRight
            size={16}
            className="text-muted-2 shrink-0 transition-transform group-hover:translate-x-0.5"
          />
        </div>
      </div>
    </button>
  );
});

export default AccountCard;
