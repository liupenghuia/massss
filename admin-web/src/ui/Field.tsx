import type { ReactNode } from "react";

type FieldProps = {
  label: string;
  hint?: string;
  error?: string;
  suggested?: boolean;
  children: ReactNode;
};

export function Field({ label, hint, error, suggested, children }: FieldProps) {
  return (
    <label className={error ? "field field-error" : "field"}>
      <span>
        {label}
        {suggested ? <span className="field-suggested">建议填写</span> : null}
      </span>
      {children}
      {error ? (
        <span className="field-error-text" role="alert">
          {error}
        </span>
      ) : hint ? (
        <span className="field-hint">{hint}</span>
      ) : null}
    </label>
  );
}
