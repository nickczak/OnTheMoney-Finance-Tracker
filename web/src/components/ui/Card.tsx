import type { HTMLAttributes } from "react";

export default function Card({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`relative rounded-[3px] bg-surface engraved ${className}`}
      {...props}
    />
  );
}
