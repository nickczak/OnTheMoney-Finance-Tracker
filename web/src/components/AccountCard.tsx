import { useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  Landmark,
  PiggyBank,
  CreditCard,
  Wallet,
  TrendingUp,
  ChevronRight,
} from "lucide-react";

import { useResponsiveLayout } from "@/lib/responsive";
import { formatMoney } from "@/lib/format";
import type { Account } from "@/types/Account";

export type AccountType = Account["accType"];

export function AccountIcon({
  accType,
  size,
}: {
  accType: AccountType;
  size: number;
}) {
  switch (accType) {
    case "CHECKING":
      return <PiggyBank size={size} color="#0078a8" />;
    case "SAVINGS":
      return <Landmark size={size} color="#0078a8" />;
    case "CREDIT_CARD":
      return <CreditCard size={size} color="#0078a8" />;
    case "LOAN":
      return <Wallet size={size} color="#0078a8" />;
    case "INVESTMENT":
      return <TrendingUp size={size} color="#0078a8" />;
  }
}

const TYPE_LABEL: Record<AccountType, string> = {
  CHECKING: "Checking",
  SAVINGS: "Savings",
  CREDIT_CARD: "Credit card",
  LOAN: "Loan",
  INVESTMENT: "Investment",
};

export default function AccountCard({
  account,
  percent,
  tileWidth,
}: {
  account: Account;
  percent?: number;
  tileWidth?: number;
}) {
  const navigate = useNavigate();
  const { scale, width } = useResponsiveLayout();
  const [hovered, setHovered] = useState(false);

  const isDebt =
    account.accType === "CREDIT_CARD" || account.accType === "LOAN";

  // When showing a percentage the card is a small informational tile and is
  // not tappable (used in the portfolio Account Mix breakdown).
  if (percent !== undefined) {
    const cardWidth = tileWidth ?? (width - 2 * 16 - 12 - 2 * 8) / 3;
    return (
      <div
        className="bg-surface border border-border rounded-xl flex flex-col justify-center items-center p-3 m-1 shadow-sm"
        style={{ width: cardWidth, height: cardWidth }}
      >
        <div
          className={`font-serif text-[10px] uppercase tracking-widest font-semibold ${
            isDebt ? "text-loss" : "text-[#0078a8]"
          }`}
        >
          {isDebt ? "Liability" : "Asset"}
        </div>
        <AccountIcon accType={account.accType} size={26} />
        <div className="font-serif text-sm font-bold text-primary truncate w-full text-center mt-1">
          {account.name}
        </div>
        <div className="font-serif text-xl text-primary mt-1 tabular-nums">
          {(percent * 100).toFixed(1)}%
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => navigate(`/account/${account.id}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`bg-surface border border-border rounded-xl p-4 my-1.5 text-left w-full transition-colors group ${
        hovered ? "border-[#009ddc]/50 bg-surface-2" : "shadow-sm"
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="w-11 h-11 flex items-center justify-center rounded-lg bg-[#f2f6f8] shrink-0">
          <AccountIcon accType={account.accType} size={22} />
        </div>

        <div className="flex-1 min-w-0">
          <div
            className="font-serif font-bold text-primary truncate"
            style={{ fontSize: 18 * scale }}
          >
            {account.name}
          </div>
          <div className="font-serif text-[11px] uppercase tracking-widest text-muted mt-0.5">
            {TYPE_LABEL[account.accType]}
          </div>
        </div>

        {percent !== undefined ? (
          <div
            className="font-serif text-primary flex-shrink truncate tabular-nums"
            style={{ fontSize: 28 * scale }}
          >
            {(percent * 100).toFixed(1)}%
          </div>
        ) : (
          <div className="flex items-center gap-1 flex-shrink max-w-[45%]">
            <div
              className={`font-serif text-primary flex-shrink truncate tabular-nums ${
                isDebt ? "text-loss" : ""
              }`}
              style={{ fontSize: 28 * scale }}
            >
              ${formatMoney(account.balance)}
            </div>
            <ChevronRight size={16} className="text-[#8597a0] shrink-0" />
          </div>
        )}
      </div>
    </button>
  );
}
