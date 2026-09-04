import { useParams, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { Loader2, Trash2, Pencil, User } from "lucide-react";

import TransactionCard from "@/components/TransactionCard";
import { AccountIcon } from "@/components/AccountCard";
import { useResponsiveLayout } from "@/lib/responsive";
import { signedAmount } from "@/lib/transactions";
import {
  deleteAccount,
  deleteTransaction,
  fetchAccountById,
  fetchAccounts,
  fetchTransactionsById,
  postTransaction,
  updateAccount,
} from "@/lib/api";
import { formatMoney } from "@/lib/format";
import type { Account } from "@/types/Account";
import type { Transaction } from "@/types/Transaction";

const ACCOUNT_TYPES = [
  "CHECKING",
  "SAVINGS",
  "CREDIT_CARD",
  "LOAN",
  "INVESTMENT",
] as const;
type AccountType = (typeof ACCOUNT_TYPES)[number];

export default function AccountDetail() {
  const navigate = useNavigate();
  const { scale, isDesktop, isMobile } = useResponsiveLayout();
  const { id } = useParams<{ id: string }>();
  const [account, setAccount] = useState<Account | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [nameEditOpen, setNameEditOpen] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [typeEditOpen, setTypeEditOpen] = useState(false);
  const [typeInput, setTypeInput] = useState<AccountType>("CHECKING");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState(true);
  const [txError, setTxError] = useState<string | null>(null);
  const [txDialogOpen, setTxDialogOpen] = useState(false);
  const [txAmount, setTxAmount] = useState("");
  const [txDescription, setTxDescription] = useState("");
  const [txType, setTxType] = useState<"DEPOSIT" | "WITHDRAW">("DEPOSIT");
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [txToAccountId, setTxToAccountId] = useState<number | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchAccountById(Number(id))
      .then(setAccount)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Failed to load account"),
      );
  }, [id]);

  const loadTransactions = useCallback(() => {
    if (!id) return;
    setTxLoading(true);
    fetchTransactionsById(Number(id))
      .then(setTransactions)
      .catch((err: unknown) =>
        setTxError(
          err instanceof Error ? err.message : "Failed to load transactions",
        ),
      )
      .finally(() => setTxLoading(false));
  }, [id]);

  useEffect(() => {
    loadTransactions();
    fetchAccounts()
      .then(setAccounts)
      .catch(() => {});
  }, [loadTransactions]);

  const onDelete = useCallback(async () => {
    if (!id) return;
    await deleteAccount(Number(id));
    navigate("/accounts");
  }, [id, navigate]);

  const saveName = useCallback(async () => {
    if (!account || nameInput.trim() === "") return;
    const updated = await updateAccount({ ...account, name: nameInput.trim() });
    setAccount(updated);
    setNameEditOpen(false);
    setNameInput("");
  }, [account, nameInput]);

  const saveType = useCallback(async () => {
    if (!account || !id) return;
    const updated = await updateAccount({ ...account, accType: typeInput });
    setAccount(updated);
    setTypeEditOpen(false);
  }, [account, typeInput, id]);

  const saveTransaction = useCallback(async () => {
    if (!id) return;
    const amount = Number(txAmount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    try {
      const isTransfer = txToAccountId !== null;
      await postTransaction(Number(id), {
        type: isTransfer ? "TRANSFER" : txType,
        amount,
        description: txDescription.trim(),
        fromAccountId: isTransfer ? Number(id) : null,
        toAccountId: isTransfer ? txToAccountId : null,
        date: new Date().toISOString().slice(0, 10),
      });
      setTxDialogOpen(false);
      setTxAmount("");
      setTxDescription("");
      setTxType("DEPOSIT");
      setTxToAccountId(null);
      loadTransactions();
      const updated = await fetchAccountById(Number(id));
      setAccount(updated);
    } catch (err) {
      setTxError(
        err instanceof Error ? err.message : "Failed to save transaction",
      );
    }
  }, [id, txAmount, txDescription, txType, txToAccountId, loadTransactions]);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget || !id) return;
    try {
      await deleteTransaction(deleteTarget.id);
      setDeleteTarget(null);
      loadTransactions();
      const updated = await fetchAccountById(Number(id));
      setAccount(updated);
    } catch (err) {
      setTxError(
        err instanceof Error ? err.message : "Failed to delete transaction",
      );
    }
  }, [deleteTarget, id, loadTransactions]);

  if (error) {
    return (
      <div className="bg-bg">
        <div
          className={`p-6 text-loss font-serif ${isDesktop ? "max-w-[1100px] mx-auto" : ""}`}
        >
          Could not load account: {error}
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="bg-bg min-h-full">
        <div className={`p-6 ${isDesktop ? "max-w-[1100px] mx-auto" : ""}`}>
          <Loader2 className="animate-spin mt-6 text-muted" />
        </div>
      </div>
    );
  }

  const container = `bg-bg min-h-full pb-20 ${isDesktop ? "max-w-[1100px] mx-auto" : ""}`;
  const inner = isDesktop ? "px-8" : "px-6";

  return (
    <>
      <div className={container}>
        {/* Navy hero */}
        <div
          className={`bg-gradient-to-br from-navy to-navy-deep pb-9 pt-4 ${inner}`}
        >
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate("/accounts")}
              className="font-serif text-[#9dc4d8] hover:text-white transition-colors text-[15px]"
            >
              ← Accounts
            </button>
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              className="p-2 rounded-lg text-[#e2564e] hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Delete account"
            >
              <Trash2 size={20} />
            </button>
          </div>

          <div className="flex flex-col items-center mt-4">
            <div className="font-serif text-[12px] uppercase tracking-widest text-[#9dc4d8]">
              Current Balance
            </div>
            <div
              className={`font-serif font-extrabold mt-1.5 text-center truncate w-full tabular-nums ${
                account.balance < 0 ? "text-[#e2564e]" : "text-white"
              }`}
              style={{ fontSize: (isMobile ? 48 : 72) * scale }}
            >
              ${formatMoney(account.balance)}
            </div>
            <div className="flex flex-row items-center justify-center gap-2 mt-2">
              <AccountIcon accType={account.accType} size={20} />
              <div
                className="font-serif text-white text-center truncate"
                style={{ fontSize: (isMobile ? 20 : 28) * scale }}
              >
                {account.name}
              </div>
              <button
                type="button"
                onClick={() => setNameEditOpen(true)}
                className="p-1"
                aria-label="Edit account name"
              >
                <Pencil size={14} color="#9dc4d8" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => setTypeEditOpen(true)}
              className="flex flex-row items-center justify-center gap-1.5 mt-1"
            >
              <span className="font-serif text-[13px] text-[#9dc4d8] uppercase tracking-widest">
                {account.accType}
              </span>
              <Pencil size={11} color="#9dc4d8" />
            </button>
          </div>
        </div>

        <div className={`${inner} mt-6`}>
          <div className="flex flex-row items-center justify-between mb-3">
            <div className="font-serif text-lg font-bold text-primary">
              Transactions
            </div>
            <button
              type="button"
              onClick={() => setTxDialogOpen(true)}
              className="rounded-lg bg-brand px-4 py-2 font-serif text-[13px] font-bold text-on-blue hover:bg-brand-pressed transition-colors"
            >
              + Add
            </button>
          </div>

          {txLoading ? (
            <Loader2 className="animate-spin mt-6 text-muted" />
          ) : txError ? (
            <div className="font-serif text-loss mt-6">{txError}</div>
          ) : transactions.length === 0 ? (
            <div className="font-serif text-muted-2 italic p-6 text-center">
              No transactions yet.
            </div>
          ) : (
            (() => {
              // Oldest first so we can reconstruct the balance after each
              // transaction by walking back from the current account balance.
              const sorted = [...transactions].sort((a, b) =>
                a.date === b.date ? a.id - b.id : a.date.localeCompare(b.date),
              );
              const acctId = Number(id);
              const balances = new Array<number>(sorted.length);
              let running = account.balance;
              for (let i = sorted.length - 1; i >= 0; i--) {
                balances[i] = running;
                const delta = signedAmount(sorted[i], acctId);
                if (delta !== null) running -= delta;
              }
              return sorted.map((item, i) => {
                const toAccountName =
                  item.type === "TRANSFER" && item.toAccountId !== null
                    ? accounts.find((a) => a.id === item.toAccountId)?.name
                    : undefined;
                return (
                  <TransactionCard
                    key={item.id}
                    transaction={item}
                    accountId={acctId}
                    toAccountName={toAccountName}
                    balanceAfter={balances[i]}
                    onDelete={() => setDeleteTarget(item)}
                  />
                );
              });
            })()
          )}
        </div>
      </div>

      {nameEditOpen && (
        <div className="fixed inset-0 bg-navy-deep/60 flex items-center justify-center p-6 z-50 backdrop-blur-sm">
          <div className="w-full max-w-[360px] bg-surface border border-border rounded-xl p-6 shadow-xl">
            <div className="font-serif text-xl font-bold text-primary mb-4">
              Edit Account Name
            </div>
            <div className="flex flex-row items-center gap-3 bg-surface-2 rounded-lg border border-border px-4 py-2.5 mb-6 focus-within:border-[#009ddc]/60 transition-colors">
              <User size={20} color="#8597a0" className="shrink-0" />
              <input
                className="flex-1 bg-transparent text-primary font-serif text-lg outline-none placeholder:text-muted-2"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Name"
                autoFocus
              />
            </div>
            <div className="flex flex-row justify-end gap-3">
              <button
                type="button"
                onClick={() => setNameEditOpen(false)}
                className="px-4 py-2.5 rounded-lg font-serif text-sm text-muted hover:bg-surface-2 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => saveName()}
                className="px-5 py-2.5 rounded-lg bg-brand font-serif text-sm font-bold text-on-blue hover:bg-brand-pressed transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {typeEditOpen && (
        <div className="fixed inset-0 bg-navy-deep/60 flex items-center justify-center p-6 z-50 backdrop-blur-sm">
          <div className="w-full max-w-[320px] bg-surface border border-border rounded-xl p-6 shadow-xl">
            <div className="font-serif text-xl font-bold text-primary mb-4">
              Edit Account Type
            </div>
            <div className="flex flex-row flex-wrap justify-center gap-2 mb-6">
              {ACCOUNT_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setTypeInput(type)}
                  className={`px-3 py-1.5 rounded-full font-serif text-[12px] transition-colors ${
                    type === typeInput
                      ? "bg-[#eaf2f6] text-info border border-[#b5d7e6] font-bold"
                      : "text-muted border border-border hover:text-primary"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
            <div className="flex flex-row justify-end gap-3">
              <button
                type="button"
                onClick={() => setTypeEditOpen(false)}
                className="px-4 py-2.5 rounded-lg font-serif text-sm text-muted hover:bg-surface-2 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => saveType()}
                className="px-5 py-2.5 rounded-lg bg-brand font-serif text-sm font-bold text-on-blue hover:bg-brand-pressed transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmOpen && (
        <div className="fixed inset-0 bg-navy-deep/60 flex items-center justify-center p-6 z-50 backdrop-blur-sm">
          <div className="w-full max-w-[320px] bg-surface border border-border rounded-xl p-6 shadow-xl">
            <div className="font-serif text-xl font-bold text-primary mb-2">
              Delete account?
            </div>
            <div className="font-serif text-[14px] text-muted mb-6">
              This will permanently remove {account.name}. This cannot be
              undone.
            </div>
            <div className="flex flex-row justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="px-4 py-2.5 rounded-lg font-serif text-sm text-muted hover:bg-surface-2 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => onDelete()}
                className="px-5 py-2.5 rounded-lg bg-danger/10 text-loss font-serif text-sm font-bold hover:bg-danger/20 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {txDialogOpen && (
        <div className="fixed inset-0 bg-navy-deep/60 flex items-center justify-center p-6 z-50 backdrop-blur-sm">
          <div className="w-full max-w-[360px] bg-surface border border-border rounded-xl p-6 shadow-xl">
            <div className="font-serif text-xl font-bold text-primary mb-4">
              Add Transaction
            </div>
            {txToAccountId === null && (
              <div className="flex flex-row justify-center gap-2 mb-5">
                {(["DEPOSIT", "WITHDRAW"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setTxType(type)}
                    className={`px-5 py-2 rounded-full font-serif text-[13px] transition-colors ${
                      type === txType
                        ? "bg-[#eaf2f6] text-info border border-[#b5d7e6] font-bold"
                        : "text-muted border border-border hover:text-primary"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            )}
            <div className="font-serif text-[11px] uppercase tracking-widest text-muted mb-2">
              Transfer to another account (optional)
            </div>
            <div className="flex flex-row flex-wrap justify-center gap-2 mb-5 max-h-40 overflow-auto">
              <button
                type="button"
                onClick={() => setTxToAccountId(null)}
                className={`px-3 py-1.5 rounded-full font-serif text-[12px] max-w-[150px] truncate transition-colors ${
                  txToAccountId === null
                    ? "bg-[#eaf2f6] text-info border border-[#b5d7e6] font-bold"
                    : "text-muted border border-border hover:text-primary"
                }`}
              >
                None
              </button>
              {accounts
                .filter((a) => a.id !== Number(id))
                .map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setTxToAccountId(a.id)}
                    className={`px-3 py-1.5 rounded-full font-serif text-[12px] max-w-[150px] truncate transition-colors ${
                      txToAccountId === a.id
                        ? "bg-[#eaf2f6] text-info border border-[#b5d7e6] font-bold"
                        : "text-muted border border-border hover:text-primary"
                    }`}
                  >
                    {a.name}
                  </button>
                ))}
            </div>
            <input
              className="font-serif text-lg text-primary bg-surface-2 rounded-lg border border-border px-4 py-3 mb-3 outline-none focus:border-[#009ddc]/60 w-full placeholder:text-muted-2 tabular-nums"
              value={txAmount}
              onChange={(e) => setTxAmount(e.target.value)}
              type="number"
              placeholder="Amount"
              autoFocus
            />
            <input
              className="font-serif text-lg text-primary bg-surface-2 rounded-lg border border-border px-4 py-3 mb-6 outline-none focus:border-[#009ddc]/60 w-full placeholder:text-muted-2"
              value={txDescription}
              onChange={(e) => setTxDescription(e.target.value)}
              placeholder="Description"
            />
            <div className="flex flex-row justify-end gap-3">
              <button
                type="button"
                onClick={() => setTxDialogOpen(false)}
                className="px-4 py-2.5 rounded-lg font-serif text-sm text-muted hover:bg-surface-2 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => saveTransaction()}
                className="px-5 py-2.5 rounded-lg bg-brand font-serif text-sm font-bold text-on-blue hover:bg-brand-pressed transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-navy-deep/60 flex items-center justify-center p-6 z-50 backdrop-blur-sm">
          <div className="w-full max-w-[320px] bg-surface border border-border rounded-xl p-6 shadow-xl">
            <div className="font-serif text-xl font-bold text-primary mb-2">
              Delete transaction?
            </div>
            <div className="font-serif text-[14px] text-muted mb-6">
              This will permanently remove{" "}
              {deleteTarget.description || "this transaction"}. This cannot be
              undone.
            </div>
            <div className="flex flex-row justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2.5 rounded-lg font-serif text-sm text-muted hover:bg-surface-2 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => confirmDelete()}
                className="px-5 py-2.5 rounded-lg bg-danger/10 text-loss font-serif text-sm font-bold hover:bg-danger/20 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
