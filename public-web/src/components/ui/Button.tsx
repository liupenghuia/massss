import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  loading?: boolean;
  block?: boolean;
};

const CLASS_NAME: Record<Variant, string> = {
  primary: "btn btn-primary",
  secondary: "btn btn-secondary",
  ghost: "btn btn-ghost",
};

export function Button({ variant = "secondary", loading = false, disabled, block, className, children, ...rest }: Props) {
  const extra = [CLASS_NAME[variant], block ? "btn-block" : "", className ?? ""].filter(Boolean).join(" ");
  return (
    <button className={extra} disabled={disabled || loading} aria-busy={loading} {...rest}>
      {loading ? "处理中…" : children}
    </button>
  );
}
