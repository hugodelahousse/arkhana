import type { ButtonHTMLAttributes } from "react";

type Size = "sm" | "md" | "lg";
type Variant = "outline" | "fill";

const SIZE: Record<Size, string> = {
  sm: "px-3 py-1 text-xs",
  md: "px-5 py-2 text-xs",
  lg: "px-6 py-3 text-sm",
};

const VARIANT: Record<Variant, string> = {
  outline: "border text-primary border-primary/60 hover:border-primary",
  fill: "border text-primary border-primary bg-primary/10 hover:bg-primary/15",
};

export function buttonClass(size: Size = "md", variant: Variant = "outline", extra = "") {
  return `tracking-widest uppercase transition-opacity ${SIZE[size]} ${VARIANT[variant]} ${extra}`.trim();
}

export function Button({
  size = "md",
  variant = "outline",
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { size?: Size; variant?: Variant }) {
  return (
    <button className={buttonClass(size, variant, className)} {...props}>
      {children}
    </button>
  );
}
