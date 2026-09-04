export default function Logo({
  size = 34,
  showWordmark = true,
}: {
  size?: number;
  showWordmark?: boolean;
}) {
  return (
    <div className="flex flex-row items-center gap-2.5">
      <div
        className="rounded-xl bg-gradient-to-br from-brand to-emerald-600 flex items-center justify-center shadow-[0_4px_16px_rgba(16,227,128,0.3)]"
        style={{ width: size, height: size }}
      >
        <span
          className="font-bold text-on-brand"
          style={{ fontSize: size * 0.55 }}
        >
          $
        </span>
      </div>
      {showWordmark && (
        <span className="font-semibold tracking-tight text-[17px] text-primary">
          On The Money
        </span>
      )}
    </div>
  );
}
