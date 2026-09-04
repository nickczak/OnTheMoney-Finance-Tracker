import type { ReactNode } from "react";

export default function SectionHeader({
  title,
  action,
  className = "",
}: {
  title: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-row items-center justify-between gap-3 mb-3 ${className}`}
    >
      <h2 className="font-semibold text-[16px] tracking-tight text-primary">
        {title}
      </h2>
      {action}
    </div>
  );
}
