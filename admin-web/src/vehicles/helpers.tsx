import { useEffect, useState } from "react";
import { ApiRequestError } from "../api";
import { CORE_FIELD_LABEL, type Status } from "./types";

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item));
}

/** 把服务端错误码译成「缺什么、为什么」，禁止把笼统 message 原样丢给操作人（ADR-116）。 */
export function describeError(err: unknown, fallback: string): string {
  if (err instanceof ApiRequestError && err.code === "PUBLISH_PRECONDITION_FAILED") {
    const missing = asStringArray(err.details.missing);
    const reasons: string[] = [];
    if (missing.includes("images")) {
      const n = err.details.imageCount;
      const count = typeof n === "number" ? n : undefined;
      reasons.push(
        count !== undefined
          ? `车辆图片至少 4 张才能上架，现在只有 ${count} 张`
          : "车辆图片至少 4 张才能上架，当前不足 4 张",
      );
    }
    if (missing.includes("price")) {
      reasons.push("还没有填写价格（标价或面谈都可以）");
    }
    if (missing.includes("coreFields")) {
      const labels = asStringArray(err.details.missingCoreFields).map(
        (f) => CORE_FIELD_LABEL[f] ?? f,
      );
      reasons.push(
        labels.length > 0
          ? `这些必填信息还是空的：${labels.join("、")}（草稿可以空着，上架前必须填齐）`
          : "品牌、车型等核心信息尚未填齐（草稿可以空着，上架前必须填齐）",
      );
    }
    if (reasons.length === 0) {
      return "无法上架：还不满足发布条件。请检查图片是否满 4 张、是否已填价格、核心信息是否填齐。";
    }
    return `无法上架。${reasons.join("；")}。`;
  }
  if (err instanceof ApiRequestError && err.code === "ILLEGAL_STATUS_TRANSITION") {
    const action = err.details.action === "unpublish" ? "下架" : "发布";
    return `当前状态不能${action}。只有草稿或已下架可以发布，只有已上架可以下架。`;
  }
  if (err instanceof ApiRequestError && err.code === "PUBLISHED_IMAGE_MIN") {
    return "已上架车辆不能删到不足 4 张图。请先下架，或先补图再删。";
  }
  if (err instanceof ApiRequestError && err.code === "VEHICLE_VERSION_CONFLICT") {
    return "这辆车刚被别人改过。请返回列表重新打开后再保存，以免覆盖别人的修改。";
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
