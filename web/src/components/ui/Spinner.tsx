import { Loader2 } from "lucide-react";

export default function Spinner({
  size = 22,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <Loader2 size={size} className={`animate-spin text-muted ${className}`} />
  );
}
