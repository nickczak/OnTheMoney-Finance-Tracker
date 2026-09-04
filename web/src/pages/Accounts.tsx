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
        <div className="font-serif text-danger mb-4">
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
    <div className="min-h-full bg-black">
      <ScreenFrame className="p-4 pb-20">
        <div className="overflow-auto">
          {loading ? (
            <Loader2 className="animate-spin mt-6 text-[#98989d]" />
          ) : accounts.length === 0 ? (
            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              className="w-full bg-[#2c2c2e] py-3.5 mb-4 font-serif font-bold text-white tracking-wide"
              style={{ fontSize: 16 * scale }}
            >
              + Add Account
            </button>
          ) : null}

          {accounts.length === 0 && !loading ? (
            <div className="font-serif text-[#98989d] italic text-center mt-2">
              No accounts yet — tap the Add Account button to create your first
              one.
            </div>
          ) : null}

          {createError ? (
            <div className="font-serif text-danger mb-4">{createError}</div>
          ) : null}

          <div className="font-serif text-lg font-bold text-white mt-2 mb-1">
            Assets
          </div>
          {assets.length === 0 ? (
            <div className="font-serif text-[#98989d] italic py-2.5">
              No asset accounts yet.
            </div>
          ) : (
            assets.map((account) => (
              <AccountCard key={account.id} account={account} />
            ))
          )}

          <div className="font-serif text-lg font-bold text-white mt-5 mb-1">
            Liabilities
          </div>
          {liabilities.length === 0 ? (
            <div className="font-serif text-[#98989d] italic py-2.5">
              No liability accounts yet.
            </div>
          ) : (
            liabilities.map((account) => (
              <AccountCard key={account.id} account={account} />
            ))
          )}

          {accounts.length > 0 && (
            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              className="w-full bg-[#2c2c2e] py-3.5 mt-4 font-serif font-bold text-white tracking-wide"
              style={{ fontSize: 16 * scale }}
            >
              + Add Account
            </button>
          )}
        </div>
      </ScreenFrame>

      {dialogOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-6 z-50">
          <div
            className="w-full max-w-[420px] bg-black border border-white p-6"
            style={{ maxHeight: Math.min(400, height * 0.72) }}
          >
            <div
              className="font-serif text-xl font-bold text-white mb-4"
              style={{ fontSize: 20 * scale }}
            >
              Add Account
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
            <div className="flex flex-row items-center gap-3">
              <DollarSign size={24} color="#98989d" />
              <input
                className="flex-1 bg-black text-white font-serif text-lg outline-none border-b border-[#3a3a3c] py-2.5 px-3 mb-3.5 max-w-[280px] placeholder:text-[#98989d]"
                value={balanceInput}
                onChange={(e) => setBalanceInput(e.target.value)}
                type="number"
                placeholder="Balance"
              />
            </div>
            <div className="flex flex-row flex-wrap justify-center gap-2 mb-5">
              {ACCOUNT_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setTypeInput(type)}
                  className={`py-2 px-3 font-serif text-[13px] text-white ${
                    type === typeInput ? "bg-[#2c2c2e]" : "bg-[#1c1c1e]"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
            <div className="flex flex-row justify-center gap-6">
              <button
                type="button"
                onClick={() => setDialogOpen(false)}
                className="py-2.5 px-4 font-serif text-base text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => saveAccount()}
                className="py-2.5 px-4 font-serif text-base text-white"
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
