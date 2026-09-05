import { useCallback, useEffect, useState } from "react";

import AccountCard from "@/components/accounts/AccountCard";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Spinner from "@/components/ui/Spinner";
import { Field, Input } from "@/components/ui/Input";
import { Pill, PillGroup } from "@/components/ui/Pill";
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
      <div className="min-h-full p-6">
        <div className="text-loss mb-4">
          Could not load accounts: {loadError}
        </div>
      </div>
    );
  }

  const assets = accounts.filter(
    (a) => a.accType !== "CREDIT_CARD" && a.accType !== "LOAN",
  );
  const liabilities = accounts.filter(
    (a) => a.accType === "CREDIT_CARD" || a.accType === "LOAN",
  );

  return (
    <div className="min-h-full">
      <div className="flex items-center justify-between mb-1.5">
        <div>
          <h1 className="font-display text-[32px] leading-none tracking-[0.02em] text-primary">
            Accounts
          </h1>
          <p className="text-muted text-[13px] mt-1.5">
            {accounts.length} linked account{accounts.length === 1 ? "" : "s"}
          </p>
        </div>
        <Button variant="primary" size="md" onClick={() => setDialogOpen(true)}>
          + Link Account
        </Button>
      </div>

      {loading ? (
        <Spinner className="mt-8" />
      ) : createError ? (
        <div className="text-loss mb-4 text-sm">{createError}</div>
      ) : null}

      {!loading && accounts.length === 0 ? (
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="w-full mt-4 rounded-[3px] bg-surface engraved border border-dashed border-border-strong py-12 text-primary font-semibold hover:border-brand/40 hover:bg-surface-2 transition-colors"
        >
          + Add your first account
        </button>
      ) : null}

      {!loading && accounts.length > 0 ? (
        <>
          <div className="mt-5">
            <div className="text-[11px] uppercase tracking-[0.16em] text-muted mb-1.5 font-medium">
              Assets
            </div>
            {assets.map((account) => (
              <AccountCard key={account.id} account={account} />
            ))}
            {assets.length === 0 && (
              <div className="text-muted-2 text-sm py-2">
                No asset accounts yet.
              </div>
            )}
          </div>
          <div className="mt-6">
            <div className="text-[11px] uppercase tracking-[0.16em] text-muted mb-1.5 font-medium">
              Liabilities
            </div>
            {liabilities.map((account) => (
              <AccountCard key={account.id} account={account} />
            ))}
            {liabilities.length === 0 && (
              <div className="text-muted-2 text-sm py-2">
                No liability accounts yet.
              </div>
            )}
          </div>
        </>
      ) : null}

      <Modal
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Add Account"
      >
        <Field label="Name" htmlFor="acctName">
          <Input
            id="acctName"
            placeholder="e.g. Everyday Checking"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            autoFocus
          />
        </Field>
        <Field label="Balance" htmlFor="acctBalance">
          <Input
            id="acctBalance"
            type="number"
            placeholder="0.00"
            value={balanceInput}
            onChange={(e) => setBalanceInput(e.target.value)}
          />
        </Field>
        <div className="mb-6">
          <div className="font-medium text-[13px] text-muted mb-2 tracking-wide">
            Type
          </div>
          <PillGroup>
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
        </div>
        <div className="flex flex-row justify-end gap-2">
          <Button variant="ghost" onClick={() => setDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={
              !nameInput.trim() || !Number.isFinite(Number(balanceInput))
            }
            onClick={() => void saveAccount()}
          >
            Save
          </Button>
        </div>
      </Modal>
    </div>
  );
}
