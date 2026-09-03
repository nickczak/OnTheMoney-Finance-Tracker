import { useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  Landmark,
  PiggyBank,
  CreditCard,
  Wallet,
  TrendingUp,
} from "lucide-react";

import { useResponsiveLayout } from "@/lib/responsive";
import { formatMoney } from "@/lib/format";
import type { Account } from "@/types/Account";

export type AccountType = Account["accType"];

function AccountIcon({
  accType,
  size,
}: {
  accType: AccountType;
  size: number;
}) {
  switch (accType) {
    case "CHECKING":
      return <PiggyBank size={size} color="#0052cc" />;
    case "SAVINGS":
      return <Landmark size={size} color="#0052cc" />;
    case "CREDIT_CARD":
      return <CreditCard size={size} color="#0052cc" />;
    case "LOAN":
      return <Wallet size={size} color="#0052cc" />;
    case "INVESTMENT":
      return <TrendingUp size={size} color="#0052cc" />;
  }
}

function AccountTypeLabel({ accType }: { accType: AccountType }) {
  switch (accType) {
    case "CHECKING":
      return "Checking";
    case "SAVINGS":
      return "Savings";
    case "CREDIT_CARD":
      return "Credit Card";
    case "LOAN":
      return "Loan";
    case "INVESTMENT":
      return "Investment";
  }
}

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

  const content = (
    <div className="flex flex-row justify-between items-center gap-4">
      <div className="w-11 h-11 rounded-full bg-brand/10 flex items-center justify-center flex-shrink-0">
        <AccountIcon accType={account.accType} size={22} />
      </div>
      <div className="flex-1 min-w-0">
        <div
          className={`font-serif font-semibold text-text truncate ${percent !== undefined ? "text-sm" : ""}`}
          style={{ fontSize: 16 * scale }}
        >
          {account.name}
        </div>
        <div
          className={`font-serif text-muted ${percent !== undefined ? "text-[10px]" : "text-xs"}`}
          style={{ marginTop: 2 }}
        >
          <AccountTypeLabel accType={account.accType} />
        </div>
      </div>
      {percent !== undefined ? (
        <div
          className="font-serif font-semibold text-text flex-shrink truncate"
          style={{ fontSize: 22 * scale }}
        >
          {(percent * 100).toFixed(1)}%
        </div>
      ) : (
        <div
          className="font-serif font-bold text-text flex-shrink truncate"
          style={{ fontSize: 20 * scale }}
        >
          ${formatMoney(account.balance)}
        </div>
      )}
    </div>
  );

  // When showing a percentage the card is purely informational and not tappable.
  if (percent !== undefined) {
    const isDebt =
      account.accType === "CREDIT_CARD" || account.accType === "LOAN";
    const cardWidth = tileWidth ?? (width - 2 * 16 - 12 - 2 * 8) / 3;
    return (
      <div
        className="bg-surface rounded-2xl border border-border shadow-sm flex flex-col justify-center items-center p-1.5 m-1"
        style={{ width: cardWidth, height: cardWidth }}
      >
        <div
          className={`font-serif text-[11px] uppercase tracking-widest font-semibold mb-1.5 ${
            isDebt ? "text-danger" : "text-success"
          }`}
        >
          {isDebt ? "Liability" : "Asset"}
        </div>
        <div className="font-serif text-sm font-semibold text-text truncate w-full text-center">
          {account.name}
        </div>
        <div className="font-serif text-[10px] text-muted">
          {account.accType}
        </div>
        <div className="font-serif text-xl font-bold text-text mt-1">
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
      className={`bg-surface rounded-2xl border border-border shadow-sm p-5 my-1.5 text-left w-full transition-colors ${
        hovered ? "border-brand/40 bg-surface-hover" : ""
      }`}
    >
      {content}
    </button>
  );
}
