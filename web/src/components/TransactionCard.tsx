import { Trash2 } from "lucide-react";

import { formatDate, formatMoney } from "@/lib/format";
import type { Transaction } from "@/types/Transaction";

export default function TransactionCard({
  transaction,
  accountId,
  toAccountName,
  onDelete,
}: {
  transaction: Transaction;
  /** The account this card is displayed under, used to decide whether a
   *  transfer moves money in (+) or out (-). Omit to hide the sign. */
  accountId?: number;
  /** Destination account name for transfers, shown after the type. */
  toAccountName?: string;
  onDelete?: () => void;
}) {
  let sign: "+" | "-" | null = null;
  if (accountId !== undefined) {
    if (transaction.type === "DEPOSIT") sign = "+";
    else if (transaction.type === "WITHDRAW") sign = "-";
    else if (transaction.type === "TRANSFER") {
      if (transaction.fromAccountId === accountId) sign = "-";
      else if (transaction.toAccountId === accountId) sign = "+";
    }
  }
  const color =
    sign === "+" ? "text-brand" : sign === "-" ? "text-danger" : "text-white";

  return (
    <div className="relative bg-black border-[3px] border-white p-4 my-2">
      {onDelete ? (
        <button
          type="button"
          onClick={onDelete}
          className="absolute top-2 right-2 p-1"
          aria-label="Delete"
        >
          <Trash2 size={16} color="#ff6b6b" />
        </button>
      ) : null}
      <div className="font-serif text-lg font-bold text-white pr-6">
        {transaction.description}
      </div>
      <div className={`font-serif text-[22px] ${color}`}>
        {sign !== null ? sign : ""}${formatMoney(transaction.amount)}
      </div>
      <div className="font-serif text-[#d0d0d0]">
        {formatDate(transaction.date)}
      </div>
      <div className="font-serif text-[#d0d0d0] mt-1">
        {transaction.type}
        {transaction.type === "TRANSFER" && toAccountName
          ? ` → ${toAccountName}`
          : ""}
      </div>
    </div>
  );
}
