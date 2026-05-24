import type { ButtonHTMLAttributes } from "react";

type Size = "sm" | "md" | "lg";

const SIZE: Record<Size, string> = {
  sm: "px-3 py-1 text-xs",
  md: "px-5 py-2 text-xs",
  lg: "px-6 py-3 text-sm",
};

export function buttonClass(size: Size = "md", extra = "") {
  return `tracking-widest uppercase border transition-opacity hover:opacity-90 ${SIZE[size]} ${extra}`.trim();
}

export function Button({
  size = "md",
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { size?: Size }) {
  return (
    <button
      className={buttonClass(size, className)}
      style={{ borderColor: "var(--color-border-default)", color: "var(--color-text-primary)" }}
      {...props}
    >
      {children}
    </button>
  );
}
