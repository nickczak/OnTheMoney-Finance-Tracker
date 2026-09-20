import {
  type ComponentProps,
  type ReactNode,
  useCallback,
  useEffect,
  useState,
} from "react";
import { usePlaidLink, type PlaidLinkOnSuccess } from "react-plaid-link";
import { Loader2 } from "lucide-react";

import Button from "@/components/ui/Button";
import { exchangePlaidPublicToken, fetchPlaidLinkToken } from "@/lib/api";

type ButtonProps = ComponentProps<typeof Button>;

/**
 * Bank-linking trigger. On click it fetches a fresh Plaid link_token from our
 * backend, opens Plaid Link, and trades the returned public_token for a synced
 * bank connection. Render happens through a mounted child (<PlaidLinkFlow />) so
 * usePlaidLink is only ever called once a token exists.
 */
export default function LinkBankButton({
  onLinked,
  className = "",
  children = "Link Bank",
  containerClassName = "",
  ...rest
}: {
  /** Runs after a bank is linked and its data synced (e.g. reload accounts). */
  onLinked?: () => Promise<void> | void;
  className?: string;
  containerClassName?: string;
  children?: ReactNode;
} & ButtonProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = useCallback(async () => {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      setLinkToken(await fetchPlaidLinkToken());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to start bank linking.",
      );
      setBusy(false);
    }
  }, [busy]);

  const handleExit = useCallback(() => {
    setLinkToken(null);
    setBusy(false);
  }, []);

  const handleSuccess = useCallback<PlaidLinkOnSuccess>(
    async (publicToken, metadata) => {
      if (!publicToken) return handleExit();
      try {
        await exchangePlaidPublicToken({
          publicToken,
          institutionId: metadata.institution?.institution_id ?? null,
          institutionName: metadata.institution?.name ?? null,
        });
        setLinkToken(null);
        setBusy(false);
        await onLinked?.();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to link your bank.",
        );
        setLinkToken(null);
        setBusy(false);
      }
    },
    [handleExit, onLinked],
  );

  return (
    <>
      <div
        className={`flex w-max max-w-full shrink-0 flex-col items-end gap-2 ${containerClassName}`}
      >
        {error ? (
          <div className="text-loss text-sm text-right max-w-xs">{error}</div>
        ) : null}
        <Button
          {...rest}
          className={className}
          onClick={() => void handleClick()}
          disabled={busy || rest.disabled}
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : null}
          {children}
        </Button>
      </div>
      {linkToken ? (
        <PlaidLinkFlow
          token={linkToken}
          onSuccess={handleSuccess}
          onExit={handleExit}
        />
      ) : null}
    </>
  );
}

/**
 * Mounted only while a link_token exists. Creates the Plaid Link instance and
 * opens it as soon as the SDK is ready; destroyed on unmount.
 */
function PlaidLinkFlow({
  token,
  onSuccess,
  onExit,
}: {
  token: string;
  onSuccess: PlaidLinkOnSuccess;
  onExit: () => void;
}) {
  const { open, ready } = usePlaidLink({
    token,
    onSuccess,
    onExit,
  });
  useEffect(() => {
    if (ready) open();
  }, [ready, open]);
  return null;
}
