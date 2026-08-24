import { useCallback, useEffect, useId, useRef, useState } from "react";

export type ConfirmSpec = {
  title: string;
  body: string;
  confirmLabel: string;
  danger?: boolean;
};

export function useConfirm() {
  const [spec, setSpec] = useState<ConfirmSpec | null>(null);
  const [busy, setBusy] = useState(false);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const confirm = useCallback((next: ConfirmSpec) => {
    setSpec(next);
    setBusy(false);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  function close(ok: boolean) {
    resolver.current?.(ok);
    resolver.current = null;
    setSpec(null);
    setBusy(false);
  }

  const dialog = spec ? (
    <ConfirmDialog
      spec={spec}
      busy={busy}
      onCancel={() => close(false)}
      onConfirm={() => {
        setBusy(true);
        close(true);
      }}
    />
  ) : null;

  return { confirm, dialog };
}

function ConfirmDialog({
  spec,
  busy,
  onCancel,
  onConfirm,
}: {
  spec: ConfirmSpec;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const titleId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      className="dialog-backdrop"
      role="presentation"
      onClick={onCancel}
      onKeyDown={(e) => {
        if (e.key === "Escape") onCancel();
      }}
    >
      <div
        className="dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="dialog-title">
          {spec.title}
        </h2>
        <p className="dialog-body">{spec.body}</p>
        <div className="dialog-actions">
          <button ref={cancelRef} type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy}>
            取消
          </button>
          <button
            type="button"
            className={spec.danger ? "btn btn-ghost btn-danger-text" : "btn btn-primary"}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "处理中…" : spec.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
