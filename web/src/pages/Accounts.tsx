import { useCallback, useEffect, useState } from "react";
import { Loader2, User, DollarSign } from "lucide-react";

import AccountCard from "@/components/AccountCard";
import ScreenFrame from "@/components/ScreenFrame";
import { useResponsiveLayout } from "@/lib/responsive";
import { createAccount, fetchAccounts } from "@/lib/api";
import type { Account } from "@/types/Account";

const ACCOUNT_TYPES = [
  "CHECKING",
  "SAVINGS",
  "CREDIT_CARD",
  "LOAN",
  "INVESTMENT",
] as const;
type AccountType = (typeof ACCOUNT_TYPES)[number];

export default function Accounts() {
  const { scale, height } = useResponsiveLayout();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [nameInput, setNameInput] = useState<string>("");
  const [balanceInput, setBalanceInput] = useState<string>("");
  const [typeInput, setTypeInput] = useState<AccountType>("CHECKING");

  const loadAccounts = useCallback(() => {
    fetchAccounts()
      .then(setAccounts)
      .catch((err: unknown) =>
        setLoadError(
          err instanceof Error ? err.message : "Failed to load accounts",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const saveAccount = async () => {
    setCreateError(null);
    const balance = Number(balanceInput);
    if (nameInput.trim() === "" || !Number.isFinite(balance)) return;
    try {
      const account = await createAccount({
        name: nameInput.trim(),
        balance,
        accType: typeInput,
      });
      setAccounts((prev) => [...prev, account]);
      setDialogOpen(false);
      setNameInput("");
      setBalanceInput("");
      setTypeInput("CHECKING");
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : "Failed to create account",
      );
    }
  };

  if (loadError) {
    return (
      <ScreenFrame>
        <div className="font-serif text-loss mb-4">
          Could not load accounts: {loadError}
        </div>
      </ScreenFrame>
    );
  }

  const assets = accounts.filter(
    (a) => a.accType !== "CREDIT_CARD" && a.accType !== "LOAN",
  );
  const liabilities = accounts.filter(
    (a) => a.accType === "CREDIT_CARD" || a.accType === "LOAN",
  );

  return (
    <div className="min-h-full bg-bg">
      <ScreenFrame className="p-5 pb-20">
        <div className="overflow-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="font-serif text-2xl font-bold text-primary">
              Accounts
            </div>
            {accounts.length > 0 && (
              <button
                type="button"
                onClick={() => setDialogOpen(true)}
                className="rounded-lg bg-brand px-4 py-2.5 font-serif text-[13px] font-bold text-on-blue hover:bg-brand-pressed transition-colors"
              >
                + Add
              </button>
            )}
          </div>

          {loading ? (
            <Loader2 className="animate-spin mt-6 text-muted" />
          ) : accounts.length === 0 ? (
            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              className="w-full bg-surface border border-dashed border-border-strong rounded-xl py-10 mb-4 font-serif font-bold text-primary tracking-wide hover:border-[#009ddc]/50 hover:bg-surface-2 transition-colors"
              style={{ fontSize: 16 * scale }}
            >
              + Add Account
            </button>
          ) : null}

          {accounts.length === 0 && !loading ? (
            <div className="font-serif text-muted-2 text-center mt-2">
              No accounts yet — tap the Add Account button to create your first
              one.
            </div>
          ) : null}

          {createError ? (
            <div className="font-serif text-loss mb-4">{createError}</div>
          ) : null}

          <div className="font-serif text-sm uppercase tracking-widest text-muted mt-2 mb-2">
            Assets
          </div>
          {assets.length === 0 ? (
            <div className="font-serif text-muted-2 py-2.5">
              No asset accounts yet.
            </div>
          ) : (
            assets.map((account) => (
              <AccountCard key={account.id} account={account} />
            ))
          )}

          <div className="font-serif text-sm uppercase tracking-widest text-muted mt-6 mb-2">
            Liabilities
          </div>
          {liabilities.length === 0 ? (
            <div className="font-serif text-muted-2 py-2.5">
              No liability accounts yet.
            </div>
          ) : (
            liabilities.map((account) => (
              <AccountCard key={account.id} account={account} />
            ))
          )}
        </div>
      </ScreenFrame>

      {dialogOpen && (
        <div className="fixed inset-0 bg-navy-deep/60 flex items-center justify-center p-6 z-50 backdrop-blur-sm">
          <div
            className="w-full max-w-[420px] bg-surface border border-border rounded-xl p-6 shadow-xl"
            style={{ maxHeight: Math.min(440, height * 0.72) }}
          >
            <div
              className="font-serif text-xl font-bold text-primary mb-5"
              style={{ fontSize: 20 * scale }}
            >
              Add Account
            </div>
            <div className="flex flex-row items-center gap-3 bg-surface-2 rounded-lg border border-border px-4 py-2.5 mb-3 focus-within:border-[#009ddc]/60 transition-colors">
              <User size={20} color="#8597a0" className="shrink-0" />
              <input
                className="flex-1 bg-transparent text-primary font-serif text-lg outline-none placeholder:text-muted-2"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Name"
                autoFocus
              />
            </div>
            <div className="flex flex-row items-center gap-3 bg-surface-2 rounded-lg border border-border px-4 py-2.5 mb-5 focus-within:border-[#009ddc]/60 transition-colors">
              <DollarSign size={20} color="#8597a0" className="shrink-0" />
              <input
                className="flex-1 bg-transparent text-primary font-serif text-lg outline-none placeholder:text-muted-2 tabular-nums"
                value={balanceInput}
                onChange={(e) => setBalanceInput(e.target.value)}
                type="number"
                placeholder="Balance"
              />
            </div>
            <div className="font-serif text-[11px] uppercase tracking-widest text-muted mb-2">
              Type
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
                onClick={() => setDialogOpen(false)}
                className="px-4 py-2.5 rounded-lg font-serif text-sm text-muted hover:bg-surface-2 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => saveAccount()}
                className="px-5 py-2.5 rounded-lg bg-brand font-serif text-sm font-bold text-on-blue hover:bg-brand-pressed transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
