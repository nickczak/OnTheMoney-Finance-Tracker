import {
  Landmark,
  PiggyBank,
  CreditCard,
  Wallet,
  TrendingUp,
} from "lucide-react";

import type { Account } from "@/types/Account";

export type AccountType = Account["accType"];

export default function AccountIcon({
  accType,
  size = 22,
}: {
  accType: AccountType;
  size?: number;
}) {
  switch (accType) {
    case "CHECKING":
      return <PiggyBank size={size} color="#55b8f5" />;
    case "SAVINGS":
      return <Landmark size={size} color="#55b8f5" />;
    case "CREDIT_CARD":
      return <CreditCard size={size} color="#55b8f5" />;
    case "LOAN":
      return <Wallet size={size} color="#55b8f5" />;
    case "INVESTMENT":
      return <TrendingUp size={size} color="#55b8f5" />;
  }
}
