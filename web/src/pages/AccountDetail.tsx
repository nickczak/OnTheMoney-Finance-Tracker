import { useParams, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { Loader2, Trash2, Pencil, User } from "lucide-react";

import TransactionCard from "@/components/TransactionCard";
import { useResponsiveLayout } from "@/lib/responsive";
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
          className={`p-6 text-danger font-serif ${isDesktop ? "max-w-[1100px] mx-auto" : ""}`}
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

  const container = `bg-bg p-6 pb-20 ${isDesktop ? "max-w-[1100px] mx-auto" : ""}`;

  return (
    <>
      <div className={container}>
        <div className="flex items-center justify-end -mt-2 mb-2">
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="p-2 rounded-lg hover:bg-surface-hover"
            aria-label="Delete account"
          >
            <Trash2 size={20} color="#d92d20" />
          </button>
        </div>

        <div className="flex flex-col items-center bg-surface border border-border rounded-3xl shadow-sm pt-6 pb-8">
          <div className="font-serif text-[12px] uppercase tracking-widest text-muted">
            Current Balance
          </div>
          <div
            className="font-serif font-bold text-text mt-1.5 text-center truncate w-full"
            style={{ fontSize: (isMobile ? 52 : 80) * scale }}
          >
            ${formatMoney(account.balance)}
          </div>
          <div className="flex flex-row items-center justify-center gap-2">
            <div
              className="font-serif text-text text-center truncate"
              style={{ fontSize: (isMobile ? 24 : 32) * scale }}
            >
              {account.name}
            </div>
            <button
              type="button"
              onClick={() => setNameEditOpen(true)}
              className="p-1 mt-2"
              aria-label="Edit name"
            >
              <Pencil size={14} color="#64748b" />
            </button>
          </div>
          <div className="flex flex-row items-center justify-center gap-2">
            <div
              className="font-serif text-muted uppercase tracking-widest text-center"
              style={{ fontSize: 14 * scale, marginTop: 6 }}
            >
              {account.accType}
            </div>
            <button
              type="button"
              onClick={() => setTypeEditOpen(true)}
              className="p-1 mt-2"
              aria-label="Edit type"
            >
              <Pencil size={12} color="#64748b" />
            </button>
          </div>
        </div>

        <div className="flex flex-row items-center justify-between mt-8">
          <div className="font-serif text-lg font-bold text-text">
            Transactions
          </div>
          <button
            type="button"
            onClick={() => setTxDialogOpen(true)}
            className="bg-brand text-white rounded-lg px-4 py-2 font-serif text-[13px] font-semibold tracking-wide hover:bg-brand-hover"
          >
            + Add
          </button>
        </div>

        {txLoading ? (
          <Loader2 className="animate-spin mt-6 text-muted" />
        ) : txError ? (
          <div className="font-serif text-danger mt-6">{txError}</div>
        ) : transactions.length === 0 ? (
          <div className="font-serif text-muted italic p-6 text-center">
            No transactions yet.
          </div>
        ) : (
          transactions.map((item) => {
            const toAccountName =
              item.type === "TRANSFER" && item.toAccountId !== null
                ? accounts.find((a) => a.id === item.toAccountId)?.name
                : undefined;
            return (
              <TransactionCard
                key={item.id}
                transaction={item}
                accountId={id ? Number(id) : undefined}
                toAccountName={toAccountName}
                onDelete={() => setDeleteTarget(item)}
              />
            );
          })
        )}
      </div>

      {nameEditOpen && (
        <div className="fixed inset-0 bg-text/60 flex items-center justify-center p-6 z-50">
          <div className="w-full max-w-[360px] bg-surface border border-border rounded-2xl shadow-lg p-5">
            <div className="font-serif text-xl font-bold text-text mb-3">
              Edit Account Name
            </div>
            <div className="flex flex-row items-center gap-3">
              <User size={20} color="#64748b" />
              <input
                className="flex-1 bg-surface-alt text-text font-serif text-[15px] outline-none border border-border rounded-xl py-2.5 px-3 mb-3 max-w-[280px] placeholder:text-muted"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Name"
                autoFocus
              />
            </div>
            <div className="flex flex-row justify-center gap-6">
              <button
                type="button"
                onClick={() => setNameEditOpen(false)}
                className="py-2.5 px-4 font-serif text-base text-muted hover:text-text"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => saveName()}
                className="py-2.5 px-4 font-serif text-base bg-brand text-white rounded-lg hover:bg-brand-hover"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {typeEditOpen && (
        <div className="fixed inset-0 bg-text/60 flex items-center justify-center p-6 z-50">
          <div className="w-full max-w-[320px] bg-surface border border-border rounded-2xl shadow-lg p-6">
            <div className="font-serif text-xl font-bold text-text mb-3">
              Edit Account Type
            </div>
            <div className="flex flex-row flex-wrap justify-center gap-2 mb-5">
              {ACCOUNT_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setTypeInput(type)}
                  className={`py-2 px-3 font-serif text-[12px] rounded-lg ${
                    type === typeInput
                      ? "bg-brand text-white"
                      : "bg-surface-alt text-muted border border-border hover:bg-surface-hover"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
            <div className="flex flex-row justify-center gap-6">
              <button
                type="button"
                onClick={() => setTypeEditOpen(false)}
                className="py-2.5 px-4 font-serif text-base text-muted hover:text-text"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => saveType()}
                className="py-2.5 px-4 font-serif text-base bg-brand text-white rounded-lg hover:bg-brand-hover"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmOpen && (
        <div className="fixed inset-0 bg-text/60 flex items-center justify-center p-6 z-50">
          <div className="w-full max-w-[320px] bg-surface border border-border rounded-2xl shadow-lg p-6">
            <div className="font-serif text-xl font-bold text-text mb-3">
              Delete account?
            </div>
            <div className="font-serif text-[15px] text-text-secondary mb-6">
              This will permanently remove {account.name}. This cannot be
              undone.
            </div>
            <div className="flex flex-row justify-center gap-6">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="py-2.5 px-4 font-serif text-base text-muted hover:text-text"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => onDelete()}
                className="py-2.5 px-4 font-serif text-base bg-danger text-white rounded-lg hover:opacity-90"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {txDialogOpen && (
        <div className="fixed inset-0 bg-text/60 flex items-center justify-center p-6 z-50">
          <div className="w-full max-w-[360px] bg-surface border border-border rounded-2xl shadow-lg p-6">
            <div className="font-serif text-xl font-bold text-text mb-3">
              Add Transaction
            </div>
            {txToAccountId === null && (
              <div className="flex flex-row justify-center gap-2 mb-5">
                {(["DEPOSIT", "WITHDRAW"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setTxType(type)}
                    className={`py-2 px-4 font-serif text-[13px] rounded-lg ${
                      type === txType
                        ? "bg-brand text-white"
                        : "bg-surface-alt text-muted border border-border hover:bg-surface-hover"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            )}
            <div className="font-serif text-[13px] uppercase tracking-widest text-muted mb-2">
              To
            </div>
            <div className="flex flex-row flex-wrap justify-center gap-2 mb-5">
              <button
                type="button"
                onClick={() => setTxToAccountId(null)}
                className={`py-2 px-3 font-serif text-[13px] rounded-lg max-w-[140px] ${
                  txToAccountId === null
                    ? "bg-brand text-white"
                    : "bg-surface-alt text-muted border border-border hover:bg-surface-hover"
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
                    className={`py-2 px-3 font-serif text-[13px] rounded-lg max-w-[140px] truncate ${
                      txToAccountId === a.id
                        ? "bg-brand text-white"
                        : "bg-surface-alt text-muted border border-border hover:bg-surface-hover"
                    }`}
                  >
                    {a.name}
                  </button>
                ))}
            </div>
            <input
              className="font-serif text-[15px] text-text bg-surface-alt border border-border rounded-xl py-2.5 px-3 mb-3 outline-none w-full placeholder:text-muted focus:border-brand"
              value={txAmount}
              onChange={(e) => setTxAmount(e.target.value)}
              type="number"
              placeholder="Amount"
              autoFocus
            />
            <input
              className="font-serif text-[15px] text-text bg-surface-alt border border-border rounded-xl py-2.5 px-3 mb-5 outline-none w-full placeholder:text-muted focus:border-brand"
              value={txDescription}
              onChange={(e) => setTxDescription(e.target.value)}
              placeholder="Description"
            />
            <div className="flex flex-row justify-center gap-6">
              <button
                type="button"
                onClick={() => setTxDialogOpen(false)}
                className="py-2.5 px-4 font-serif text-base text-muted hover:text-text"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => saveTransaction()}
                className="py-2.5 px-4 font-serif text-base bg-brand text-white rounded-lg hover:bg-brand-hover"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-text/60 flex items-center justify-center p-6 z-50">
          <div className="w-full max-w-[320px] bg-surface border border-border rounded-2xl shadow-lg p-6">
            <div className="font-serif text-xl font-bold text-text mb-3">
              Delete transaction?
            </div>
            <div className="font-serif text-[15px] text-text-secondary mb-6">
              This will permanently remove{" "}
              {deleteTarget.description || "this transaction"}. This cannot be
              undone.
            </div>
            <div className="flex flex-row justify-center gap-6">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="py-2.5 px-4 font-serif text-base text-muted hover:text-text"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => confirmDelete()}
                className="py-2.5 px-4 font-serif text-base bg-danger text-white rounded-lg hover:opacity-90"
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
