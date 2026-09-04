import { Trash2 } from "lucide-react";

import { formatDate, formatMoney } from "@/lib/format";
import { signedAmount } from "@/lib/transactions";
import type { Transaction } from "@/types/Transaction";

const TYPE_STYLE: Record<
  Transaction["type"],
  { badge: string; label: string }
> = {
  DEPOSIT: {
    badge: "bg-brand-dim text-brand border-brand/30",
    label: "Deposit",
  },
  WITHDRAW: {
    badge: "bg-loss/10 text-loss border-loss/25",
    label: "Withdrawal",
  },
  TRANSFER: {
    badge: "bg-info/10 text-info border-info/30",
    label: "Transfer",
  },
};

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
  const typeStyle = TYPE_STYLE[transaction.type];

  return (
    <div className="group relative rounded-2xl bg-surface border border-border px-4 py-3.5 mb-2.5 transition-colors hover:border-border-strong shadow-[0_8px_24px_rgba(0,0,0,0.2)]">
      {onDelete ? (
        <button
          type="button"
          onClick={onDelete}
          className="absolute top-2.5 right-2.5 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-surface-3 transition-opacity"
          aria-label="Delete"
        >
          <Trash2 size={15} color="#ff5c5c" />
        </button>
      ) : null}

      <div className="flex items-start justify-between gap-3 pr-8">
        <div className="min-w-0">
          <div className="font-medium text-primary truncate">
            {transaction.description || typeStyle.label}
          </div>
          <div className="text-[12px] text-muted mt-0.5">
            {formatDate(transaction.date)}
          </div>
        </div>
        <div
          className={`font-bold text-[19px] whitespace-nowrap tabular-nums tracking-tight ${color}`}
        >
          {sign !== null ? sign : ""}${formatMoney(transaction.amount)}
        </div>
      </div>

      <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-border/70">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`text-[10px] uppercase tracking-[0.14em] font-semibold px-2 py-0.5 rounded-full border ${typeStyle.badge}`}
          >
            {typeStyle.label}
          </span>
          {transaction.type === "TRANSFER" && toAccountName ? (
            <span className="text-[12px] text-muted truncate">
              → {toAccountName}
            </span>
          ) : null}
        </div>
        {balanceAfter !== undefined ? (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-[0.12em] text-muted">
              Balance
            </span>
            <span className="text-[13px] font-semibold text-primary tabular-nums">
              ${formatMoney(balanceAfter)}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
