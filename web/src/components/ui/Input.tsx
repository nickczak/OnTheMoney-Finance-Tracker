import type {
  InputHTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
} from "react";

export const inputClass =
  "w-full bg-bg-2 border border-border rounded-xl px-4 py-3 text-[15px] text-primary outline-none transition-all placeholder:text-muted-2 tabular-nums focus:border-brand/50 focus:ring-2 focus:ring-brand/20";

export function Input({
  id,
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input id={id} className={`${inputClass} ${className}`} {...props} />;
}

export function Field({
  label,
  htmlFor,
  children,
  hint,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
  hint?: string;
} & LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label htmlFor={htmlFor} className="block mb-4 last:mb-0">
      <span className="block font-medium text-[13px] text-muted mb-1.5 tracking-wide">
        {label}
      </span>
      {children}
      {hint && (
        <span className="block text-[12px] text-muted-2 mt-1">{hint}</span>
      )}
    </label>
  );
}
