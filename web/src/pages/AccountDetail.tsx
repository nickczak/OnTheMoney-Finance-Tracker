import { useParams, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Trash2, Pencil } from "lucide-react";

import TransactionCard from "@/components/transactions/TransactionCard";
import AccountIcon from "@/components/accounts/AccountIcon";
import HeroHeader from "@/components/layout/HeroHeader";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Spinner from "@/components/ui/Spinner";
import SectionHeader from "@/components/ui/SectionHeader";
import { Field, Input } from "@/components/ui/Input";
import { Pill, PillGroup } from "@/components/ui/Pill";
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
  const { scale, isMobile } = useResponsiveLayout();
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
      <div className="min-h-full p-6">
        <div className="text-loss">Could not load account: {error}</div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="min-h-full p-6">
        <Spinner className="mt-6" />
      </div>
    );
  }

  return (
    <div className="min-h-full">
      {/* Hero */}
      <HeroHeader>
        <div className="pt-4 pb-9">
          <div className="flex items-center justify-between px-8">
            <button
              type="button"
              onClick={() => navigate("/accounts")}
              className="inline-flex items-center gap-1.5 text-[14px] text-muted hover:text-primary transition-colors py-2.5 px-2 -ml-2"
              aria-label="Back to accounts"
            >
              <ArrowLeft size={16} strokeWidth={2} />
              Accounts
            </button>
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              className="p-2 rounded-lg text-[#ff8080] hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Delete account"
            >
              <Trash2 size={19} />
            </button>
          </div>

          <div className="flex flex-col items-center mt-5">
            <div className="text-[11px] uppercase tracking-[0.16em] text-[#8fb6c9] font-medium">
              Current Balance
            </div>
            <div
              className={`font-serif font-bold tracking-tight text-center truncate w-full tabular-nums ${
                account.balance < 0 ? "text-loss" : "text-white"
              }`}
              style={{ fontSize: (isMobile ? 46 : 68) * scale }}
            >
              ${formatMoney(account.balance)}
            </div>
            <div className="flex flex-row items-center justify-center gap-2 mt-3">
              <AccountIcon accType={account.accType} size={19} />
              <div
                className="text-white text-center truncate font-semibold"
                style={{ fontSize: (isMobile ? 20 : 26) * scale }}
              >
                {account.name}
              </div>
              <button
                type="button"
                onClick={() => setNameEditOpen(true)}
                className="p-2"
                aria-label="Edit account name"
              >
                <Pencil size={13} color="#8fb6c9" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => setTypeEditOpen(true)}
              className="flex flex-row items-center justify-center gap-1.5 mt-1"
            >
              <span className="text-[12px] text-[#8fb6c9] uppercase tracking-[0.14em]">
                {account.accType}
              </span>
              <Pencil size={10} color="#8fb6c9" />
            </button>
          </div>
        </div>
      </HeroHeader>

      {/* Transactions */}
      <div className="mt-6 mx-auto max-w-5xl">
        <SectionHeader
          title="Transactions"
          action={
            <Button size="sm" onClick={() => setTxDialogOpen(true)}>
              + Add
            </Button>
          }
        />
        {txLoading ? (
          <Spinner className="mt-4" />
        ) : txError ? (
          <div className="text-loss mt-4 text-sm">{txError}</div>
        ) : transactions.length === 0 ? (
          <div className="text-muted-2 italic text-center p-8 rounded-[3px] bg-surface engraved">
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

      {/* Name edit */}
      <Modal
        open={nameEditOpen}
        onClose={() => setNameEditOpen(false)}
        title="Edit Account Name"
      >
        <Field label="Name" htmlFor="editName">
          <Input
            id="editName"
            placeholder="Account name"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            autoFocus
          />
        </Field>
        <div className="flex flex-row justify-end gap-2">
          <Button variant="ghost" onClick={() => setNameEditOpen(false)}>
            Cancel
          </Button>
          <Button disabled={!nameInput.trim()} onClick={() => void saveName()}>
            Save
          </Button>
        </div>
      </Modal>

      {/* Type edit */}
      <Modal
        open={typeEditOpen}
        onClose={() => setTypeEditOpen(false)}
        title="Edit Account Type"
      >
        <PillGroup className="mb-2">
          {ACCOUNT_TYPES.map((type) => (
            <Pill
              key={type}
              active={type === typeInput}
              onClick={() => setTypeInput(type)}
            >
              {type}
            </Pill>
          ))}
        </PillGroup>
        <div className="flex flex-row justify-end gap-2 mt-6">
          <Button variant="ghost" onClick={() => setTypeEditOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => void saveType()}>Save</Button>
        </div>
      </Modal>

      {/* Delete account confirm */}
      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Delete account?"
      >
        <p className="text-[14px] text-muted mb-6">
          This will permanently remove{" "}
          <span className="text-primary font-medium">{account.name}</span>. This
          cannot be undone.
        </p>
        <div className="flex flex-row justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={() => void onDelete()}>
            Delete
          </Button>
        </div>
      </Modal>

      {/* Add transaction */}
      <Modal
        open={txDialogOpen}
        onClose={() => setTxDialogOpen(false)}
        title="Add Transaction"
      >
        {txToAccountId === null && (
          <PillGroup className="mb-4">
            {(["DEPOSIT", "WITHDRAW"] as const).map((type) => (
              <Pill
                key={type}
                active={txType === type}
                onClick={() => setTxType(type)}
              >
                {type}
              </Pill>
            ))}
          </PillGroup>
        )}
        <div className="text-[11px] uppercase tracking-[0.12em] text-muted font-medium mb-2">
          Transfer to another account (optional)
        </div>
        <div className="flex flex-row flex-wrap gap-2 mb-5 max-h-40 overflow-auto">
          <Pill
            active={txToAccountId === null}
            onClick={() => setTxToAccountId(null)}
          >
            None
          </Pill>
          {accounts
            .filter((a) => a.id !== Number(id))
            .map((a) => (
              <Pill
                key={a.id}
                active={txToAccountId === a.id}
                onClick={() => setTxToAccountId(a.id)}
              >
                {a.name}
              </Pill>
            ))}
        </div>
        <Field label="Amount" htmlFor="txAmount">
          <Input
            id="txAmount"
            type="number"
            placeholder="0.00"
            value={txAmount}
            onChange={(e) => setTxAmount(e.target.value)}
            autoFocus
          />
        </Field>
        <Field label="Description" htmlFor="txDescription">
          <Input
            id="txDescription"
            placeholder="e.g. Groceries"
            value={txDescription}
            onChange={(e) => setTxDescription(e.target.value)}
          />
        </Field>
        <div className="flex flex-row justify-end gap-2 mt-1">
          <Button variant="ghost" onClick={() => setTxDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={
              !Number.isFinite(Number(txAmount)) || Number(txAmount) <= 0
            }
            onClick={() => void saveTransaction()}
          >
            Save
          </Button>
        </div>
      </Modal>

      {/* Delete transaction confirm */}
      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Delete transaction?"
      >
        <p className="text-[14px] text-muted mb-6">
          This will permanently remove{" "}
          <span className="text-primary font-medium">
            {deleteTarget?.description || "this transaction"}
          </span>
          . This cannot be undone.
        </p>
        <div className="flex flex-row justify-end gap-2">
          <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={() => void confirmDelete()}>
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
