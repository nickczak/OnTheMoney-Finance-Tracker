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
      <div className="bg-black">
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
      <div className="bg-black min-h-full">
        <div className={`p-6 ${isDesktop ? "max-w-[1100px] mx-auto" : ""}`}>
          <Loader2 className="animate-spin mt-6 text-[#98989d]" />
        </div>
      </div>
    );
  }

  const container = `bg-black p-6 pb-20 ${isDesktop ? "max-w-[1100px] mx-auto" : ""}`;

  return (
    <>
      <div className={container}>
        <div className="flex items-center justify-end -mt-2 mb-2">
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="p-2"
          >
            <Trash2 size={20} color="#ff6b6b" />
          </button>
        </div>

        <div className="flex flex-col items-center pt-2">
          <div className="font-serif text-[13px] uppercase tracking-widest text-[#98989d]">
            Current Balance
          </div>
          <div
            className="font-serif font-bold text-white mt-1.5 text-center truncate w-full"
            style={{ fontSize: (isMobile ? 56 : 88) * scale }}
          >
            ${formatMoney(account.balance)}
          </div>
          <div className="flex flex-row items-center justify-center gap-2">
            <div
              className="font-serif text-white text-center truncate"
              style={{ fontSize: (isMobile ? 24 : 34) * scale }}
            >
              {account.name}
            </div>
            <button
              type="button"
              onClick={() => setNameEditOpen(true)}
              className="p-1 mt-2"
            >
              <Pencil size={14} color="#98989d" />
            </button>
          </div>
          <div className="flex flex-row items-center justify-center gap-2">
            <div
              className="font-serif text-[#98989d] uppercase tracking-widest text-center"
              style={{ fontSize: 14 * scale, marginTop: 6 }}
            >
              {account.accType}
            </div>
            <button
              type="button"
              onClick={() => setTypeEditOpen(true)}
              className="p-1 mt-2"
            >
              <Pencil size={12} color="#98989d" />
            </button>
          </div>
        </div>

        <div className="flex flex-row items-center justify-between mt-8">
          <div className="font-serif text-lg font-bold text-white">
            Transactions
          </div>
          <button
            type="button"
            onClick={() => setTxDialogOpen(true)}
            className="border border-white px-3.5 py-1.5 font-serif text-[13px] tracking-wide text-white"
          >
            + Add
          </button>
        </div>

        {txLoading ? (
          <Loader2 className="animate-spin mt-6 text-[#98989d]" />
        ) : txError ? (
          <div className="font-serif text-danger mt-6">{txError}</div>
        ) : transactions.length === 0 ? (
          <div className="font-serif text-[#98989d] italic p-6 text-center">
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
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-6 z-50">
          <div className="w-full max-w-[360px] bg-black border border-white p-5">
            <div className="font-serif text-xl font-bold text-white mb-3">
              Edit Account Name
            </div>
            <div className="flex flex-row items-center gap-3">
              <User size={24} color="#98989d" />
              <input
                className="flex-1 bg-black text-white font-serif text-lg outline-none border-b border-[#3a3a3c] py-2.5 px-3 mb-3.5 max-w-[280px] placeholder:text-[#98989d]"
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
                className="py-2.5 px-4 font-serif text-base text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => saveName()}
                className="py-2.5 px-4 font-serif text-base text-white"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {typeEditOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-6 z-50">
          <div className="w-full max-w-[320px] bg-black border border-white p-6">
            <div className="font-serif text-xl font-bold text-white mb-3">
              Edit Account Type
            </div>
            <div className="flex flex-row flex-wrap justify-center gap-2 mb-5">
              {ACCOUNT_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setTypeInput(type)}
                  className={`py-2 px-3 font-serif text-[13px] text-white ${type === typeInput ? "bg-[#2c2c2e]" : "bg-[#1c1c1e]"}`}
                >
                  {type}
                </button>
              ))}
            </div>
            <div className="flex flex-row justify-center gap-6">
              <button
                type="button"
                onClick={() => setTypeEditOpen(false)}
                className="py-2.5 px-4 font-serif text-base text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => saveType()}
                className="py-2.5 px-4 font-serif text-base text-white"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-6 z-50">
          <div className="w-full max-w-[320px] bg-black border border-white p-6">
            <div className="font-serif text-xl font-bold text-white mb-3">
              Delete account?
            </div>
            <div className="font-serif text-[15px] text-[#d0d0d0] mb-6">
              This will permanently remove {account.name}. This cannot be
              undone.
            </div>
            <div className="flex flex-row justify-center gap-6">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="py-2.5 px-4 font-serif text-base text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => onDelete()}
                className="py-2.5 px-4 font-serif text-base text-danger"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {txDialogOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-6 z-50">
          <div className="w-full max-w-[360px] bg-black border border-white p-6">
            <div className="font-serif text-xl font-bold text-white mb-3">
              Add Transaction
            </div>
            {txToAccountId === null && (
              <div className="flex flex-row justify-center gap-2 mb-5">
                {(["DEPOSIT", "WITHDRAW"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setTxType(type)}
                    className={`py-2 px-4 font-serif text-[13px] text-white ${type === txType ? "bg-[#2c2c2e]" : "bg-[#1c1c1e]"}`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            )}
            <div className="font-serif text-[13px] uppercase tracking-widest text-[#98989d] mb-2">
              To
            </div>
            <div className="flex flex-row flex-wrap justify-center gap-2 mb-5">
              <button
                type="button"
                onClick={() => setTxToAccountId(null)}
                className={`py-2 px-3 font-serif text-[13px] text-white max-w-[140px] ${txToAccountId === null ? "bg-[#2c2c2e]" : "bg-[#1c1c1e]"}`}
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
                    className={`py-2 px-3 font-serif text-[13px] text-white max-w-[140px] truncate ${txToAccountId === a.id ? "bg-[#2c2c2e]" : "bg-[#1c1c1e]"}`}
                  >
                    {a.name}
                  </button>
                ))}
            </div>
            <input
              className="font-serif text-lg text-white bg-black border-0 border-b border-[#3a3a3c] py-2.5 px-3 mb-5 outline-none w-full placeholder:text-[#98989d]"
              value={txAmount}
              onChange={(e) => setTxAmount(e.target.value)}
              type="number"
              placeholder="Amount"
              autoFocus
            />
            <input
              className="font-serif text-lg text-white bg-black border-0 border-b border-[#3a3a3c] py-2.5 px-3 mb-5 outline-none w-full placeholder:text-[#98989d]"
              value={txDescription}
              onChange={(e) => setTxDescription(e.target.value)}
              placeholder="Description"
            />
            <div className="flex flex-row justify-center gap-6">
              <button
                type="button"
                onClick={() => setTxDialogOpen(false)}
                className="py-2.5 px-4 font-serif text-base text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => saveTransaction()}
                className="py-2.5 px-4 font-serif text-base text-white"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-6 z-50">
          <div className="w-full max-w-[320px] bg-black border border-white p-6">
            <div className="font-serif text-xl font-bold text-white mb-3">
              Delete transaction?
            </div>
            <div className="font-serif text-[15px] text-[#d0d0d0] mb-6">
              This will permanently remove{" "}
              {deleteTarget.description || "this transaction"}. This cannot be
              undone.
            </div>
            <div className="flex flex-row justify-center gap-6">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="py-2.5 px-4 font-serif text-base text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => confirmDelete()}
                className="py-2.5 px-4 font-serif text-base text-danger"
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
