import { Trash2 } from "lucide-react";

import { formatDate, formatMoney } from "@/lib/format";
import { signedAmount } from "@/lib/transactions";
import type { Transaction } from "@/types/Transaction";

export default function TransactionCard({
  transaction,
  accountId,
  toAccountName,
  balanceAfter,
  onDelete,
}: {
  transaction: Transaction;
  /** The account this card is displayed under, used to decide whether a
   *  transfer moves money in (+) or out (-). Omit to hide the sign. */
  accountId?: number;
  /** Destination account name for transfers, shown after the type. */
  toAccountName?: string;
  /** Running account balance right after this transaction was applied. */
  balanceAfter?: number;
  onDelete?: () => void;
}) {
  const delta =
    accountId !== undefined ? signedAmount(transaction, accountId) : null;
  const sign = delta === null ? null : delta >= 0 ? "+" : "-";
  const color =
    sign === "+" ? "text-gain" : sign === "-" ? "text-loss" : "text-primary";

  const pill =
    transaction.type === "DEPOSIT"
      ? "bg-[#e7f4ee] text-gain"
      : transaction.type === "WITHDRAW"
        ? "bg-[#f7e9e8] text-loss"
        : "bg-[#eaf2f6] text-info";

  return (
    <div className="group relative bg-surface border border-border rounded-xl px-4 py-3.5 mb-2.5 shadow-sm transition-colors hover:border-border-strong">
      {onDelete ? (
        <button
          type="button"
          onClick={onDelete}
          className="absolute top-2.5 right-2.5 p-1.5 rounded-lg opacity-60 hover:opacity-100 hover:bg-surface-2 transition-opacity"
          aria-label="Delete"
        >
          <Trash2 size={15} color="#c8443d" />
        </button>
      ) : null}

      <div className="flex items-start justify-between gap-3 pr-8">
        <div className="min-w-0">
          <div className="font-serif font-bold text-primary truncate">
            {transaction.description || transaction.type}
          </div>
          <div className="font-serif text-[12px] text-muted mt-0.5">
            {formatDate(transaction.date)}
          </div>
        </div>
        <div
          className={`font-serif text-[20px] font-bold whitespace-nowrap tabular-nums ${color}`}
        >
          {sign !== null ? sign : ""}${formatMoney(transaction.amount)}
        </div>
      </div>

      <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-border/60">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`font-serif text-[10px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded-full ${pill}`}
          >
            {transaction.type}
          </span>
          {transaction.type === "TRANSFER" && toAccountName ? (
            <span className="font-serif text-[12px] text-muted truncate">
              → {toAccountName}
            </span>
          ) : null}
        </div>
        {balanceAfter !== undefined ? (
          <div className="flex items-center gap-1.5">
            <span className="font-serif text-[10px] uppercase tracking-widest text-muted">
              Balance
            </span>
            <span className="font-serif text-[13px] font-bold text-primary tabular-nums">
              ${formatMoney(balanceAfter)}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
