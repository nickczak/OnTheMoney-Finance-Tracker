import { useCallback, useEffect, useState } from "react";

import LinkBankButton from "@/components/accounts/LinkBankButton";
import AccountCard from "@/components/accounts/AccountCard";
import Card from "@/components/ui/Card";
import Spinner from "@/components/ui/Spinner";
import { fetchAccounts } from "@/lib/api";
import type { Account } from "@/types/Account";

export default function Accounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

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
        <LinkBankButton onLinked={loadAccounts}>+ Link Account</LinkBankButton>
      </div>

      {loading ? <Spinner size={48} className="block mx-auto mt-16" /> : null}

      {!loading && accounts.length === 0 ? (
        <Card className="mt-4 p-12 flex flex-col items-center gap-4 text-center">
          <p className="text-muted text-sm max-w-[320px]">
            Link a bank to pull in your accounts and transactions automatically.
          </p>
          <LinkBankButton onLinked={loadAccounts}>
            + Link Your First Bank
          </LinkBankButton>
        </Card>
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
    </div>
  );
}
