/**
 * Brand lockup: the real On The Money logo (wordmark over folded currency).
 * Size it with a height utility class so responsive overrides work.
 */
export default function Logo({
  className = "",
}: {
  /** Height utility, e.g. "h-[92px]" (the logo is wide, 1300x396 source). */
  className?: string;
}) {
  return (
    <img
      src="/assets/logo-on-the-money.svg"
      alt="On The Money"
      className={`select-none w-auto h-[92px] ${className}`}
    />
  );
}
