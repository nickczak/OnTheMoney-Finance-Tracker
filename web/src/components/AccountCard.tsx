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
      return <PiggyBank size={size} color="#fff" />;
    case "SAVINGS":
      return <Landmark size={size} color="#fff" />;
    case "CREDIT_CARD":
      return <CreditCard size={size} color="#fff" />;
    case "LOAN":
      return <Wallet size={size} color="#fff" />;
    case "INVESTMENT":
      return <TrendingUp size={size} color="#fff" />;
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
      <AccountIcon accType={account.accType} size={34} />
      <div className="flex-1 min-w-0">
        <div
          className={`font-serif font-bold text-white truncate ${percent !== undefined ? "text-sm" : ""}`}
          style={{ fontSize: 18 * scale }}
        >
          {account.name}
        </div>
        <div
          className={`font-serif uppercase tracking-widest text-white ${percent !== undefined ? "text-[9px]" : ""}`}
          style={{ fontSize: 12 * scale, marginTop: 4 }}
        >
          {account.accType}
        </div>
      </div>
      {percent !== undefined ? (
        <div
          className="font-serif text-white flex-shrink truncate"
          style={{ fontSize: 28 * scale }}
        >
          {(percent * 100).toFixed(1)}%
        </div>
      ) : (
        <div
          className="font-serif text-white flex-shrink truncate"
          style={{ fontSize: 28 * scale }}
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
        className="bg-black flex flex-col justify-center items-center p-1.5 m-1 border border-white"
        style={{ width: cardWidth, height: cardWidth }}
      >
        <div
          className={`font-serif text-[11px] uppercase tracking-widest font-semibold mb-1.5 ${isDebt ? "text-danger" : "text-brand"}`}
        >
          {isDebt ? "Liability" : "Asset"}
        </div>
        <div className="font-serif text-sm font-bold text-white truncate w-full text-center">
          {account.name}
        </div>
        <div className="font-serif text-[9px] uppercase tracking-widest text-white">
          {account.accType}
        </div>
        <div className="font-serif text-xl text-white mt-1">
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
      className={`bg-black border border-white p-6 my-1.5 text-left w-full transition-colors ${
        hovered ? "bg-[#121212]" : ""
      }`}
    >
      {content}
    </button>
  );
}
