import {
  Umbrella,
  PiggyBank,
  CreditCard,
  Wallet,
  TrendingUp,
} from "lucide-react";

import type { Account } from "@/types/Account";

export type AccountType = Account["accType"];

// Warm "paper ink" tone so the icons read as engraved line art.
const INK = "#e9e3d3";

export default function AccountIcon({
  accType,
  size = 22,
}: {
  accType: AccountType;
  size?: number;
}) {
  switch (accType) {
    case "CHECKING":
      return <PiggyBank size={size} color={INK} />;
    case "SAVINGS":
      return <Umbrella size={size} color={INK} />;
    case "CREDIT_CARD":
      return <CreditCard size={size} color={INK} />;
    case "LOAN":
      return <Wallet size={size} color={INK} />;
    case "INVESTMENT":
      return <TrendingUp size={size} color={INK} />;
  }
}
