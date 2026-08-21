import { useEffect, useState } from "react";
import { ApiRequestError } from "../api";
import { CORE_FIELD_LABEL, type Status } from "./types";

// PUBLISH_PRECONDITION_FAILED 的 missing 可能含 images/price/coreFields，
// coreFields 时 details.missingCoreFields 列出具体缺失字段名（ADR-035）。
export function describeError(err: unknown, fallback: string): string {
  if (err instanceof ApiRequestError && err.code === "PUBLISH_PRECONDITION_FAILED") {
    const missingCoreFields = err.details.missingCoreFields;
    if (Array.isArray(missingCoreFields) && missingCoreFields.length > 0) {
      const labels = missingCoreFields.map((f) => CORE_FIELD_LABEL[String(f)] ?? String(f)).join("、");
      return `${err.message}：核心字段缺失（${labels}）`;
    }
  }
  return err instanceof Error ? err.message : fallback;
}

export function statusTag(status: Status): string {
  if (status === "published") return "tag tag-accent-2";
  if (status === "draft") return "tag tag-neutral";
  return "tag tag-outline";
}

export function brandMono(brand: string): string {
  const t = brand.trim();
  if (!t) return "车";
  return t.slice(0, 1);
}

export function formatPrice(p: { type: string; amount: number | null } | null): string {
  if (!p) return "未填";
  if (p.type === "negotiable" || p.type === "unset" || p.amount == null) return "面议";
  return `${(p.amount / 10000).toFixed(2)} 万`;
}

export function ThumbPreview({ src, alt }: { src: string; alt: string }) {
  const [ok, setOk] = useState(true);
  useEffect(() => {
    setOk(true);
  }, [src]);
  if (!ok) return <span className="thumb-fallback">无法预览</span>;
  return <img src={src} alt={alt} onError={() => setOk(false)} />;
}
