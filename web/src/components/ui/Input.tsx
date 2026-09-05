import type {
  InputHTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
} from "react";

export const inputClass =
  "w-full bg-[#0e0e0e] border border-[#2e2e2e] rounded-[2px] px-4 py-3 text-[15px] text-primary outline-none transition-all placeholder:text-muted-2 tabular-nums focus:border-brand/60 focus:ring-2 focus:ring-brand/15 shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)]";

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
