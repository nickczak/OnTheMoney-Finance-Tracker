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
    sign === "+" ? "text-success" : sign === "-" ? "text-danger" : "text-text";

  return (
    <div className="relative bg-surface border border-border rounded-2xl shadow-sm p-4 my-2">
      {onDelete ? (
        <button
          type="button"
          onClick={onDelete}
          className="absolute top-2.5 right-2.5 p-1"
          aria-label="Delete"
        >
          <Trash2 size={16} color="#d92d20" />
        </button>
      ) : null}
      <div className="font-serif text-[15px] font-semibold text-text pr-6">
        {transaction.description}
      </div>
      <div className={`font-serif text-[22px] font-bold ${color}`}>
        {sign !== null ? sign : ""}${formatMoney(transaction.amount)}
      </div>
      <div className="font-serif text-[13px] text-muted">
        {formatDate(transaction.date)}
      </div>
      <div className="font-serif text-[12px] text-muted tracking-wide mt-0.5 uppercase">
        {transaction.type}
        {transaction.type === "TRANSFER" && toAccountName
          ? ` → ${toAccountName}`
          : ""}
      </div>
    </div>
  );
}
