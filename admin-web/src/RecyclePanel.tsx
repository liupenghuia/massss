import { useEffect, useState } from "react";
import { api } from "./api";

type RecycleItem = {
  id: number;
  version: number;
  originalStatus: string;
  trashedAt: string;
  purgeDueAt: string;
  purged: boolean;
  brand: string;
  model: string;
};

type ImageItem = { id: number; url: string; caption: string };
type ReportItem = { id: number; url: string; contentType: string; byteSize: number };
type PriceValue = { type: "amount"; amount: number } | { type: "negotiable"; amount: null };
type PriceRecordItem = { id: number; from: PriceValue; to: PriceValue; createdAt: string };

const ORIGINAL: Record<string, string> = {
  draft: "草稿",
  published: "已上架",
  unpublished: "已下架",
};

/** ADR-090：剩余天数向下取整，不足一天为 0 */
function remainingDaysFloor(purgeDueAt: string): number {
  const ms = new Date(purgeDueAt).getTime() - Date.now();
  if (Number.isNaN(ms)) return 0;
  return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
}

export function RecyclePanel() {
  const [items, setItems] = useState<RecycleItem[]>([]);
  const [keyword, setKeyword] = useState("");
  const [error, setError] = useState("");
  const [detailId, setDetailId] = useState<number | null>(null);
  const [detailImages, setDetailImages] = useState<ImageItem[]>([]);
  const [detailReports, setDetailReports] = useState<ReportItem[]>([]);
  const [detailPrices, setDetailPrices] = useState<PriceRecordItem[]>([]);

  async function load() {
    setError("");
    const qs = new URLSearchParams({ page: "1", pageSize: "50" });
    if (keyword.trim()) qs.set("keyword", keyword.trim());
    const data = await api<{ items: RecycleItem[] }>(`/admin/recycle-bin?${qs}`);
    setItems(data.items);
  }

  useEffect(() => {
    void load().catch((err) => setError(err instanceof Error ? err.message : "加载失败"));
  }, []);

  async function viewDetail(item: RecycleItem) {
    setError("");
    setDetailId(item.id);
    try {
      const [imgs, reps, prices] = await Promise.all([
        api<{ items: ImageItem[] }>(`/admin/vehicles/${item.id}/images`),
        api<{ items: ReportItem[] }>(`/admin/vehicles/${item.id}/reports`),
        api<{ items: PriceRecordItem[] }>(`/admin/vehicles/${item.id}/price-records`),
      ]);
      setDetailImages(imgs.items);
      setDetailReports(reps.items);
      setDetailPrices(prices.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载详情失败");
    }
  }

  async function restore(item: RecycleItem) {
    setError("");
    try {
      await api(`/admin/vehicles/${item.id}/restore`, {
        method: "POST",
        body: JSON.stringify({ version: item.version }),
      });
      setDetailId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "恢复失败");
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>回收站</h2>
          <p className="page-sub">删除后保留 1 个月，到期自动清除</p>
        </div>
        <div className="toolbar">
          <input
            className="input"
            placeholder="品牌 / 车型"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <button type="button" className="btn btn-secondary" onClick={() => void load()}>
            筛选
          </button>
        </div>
      </div>
      {error ? (
        <p className="banner banner-warn" role="alert">
          {error}
        </p>
      ) : null}
      <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>车辆</th>
            <th>原状态</th>
            <th>到期清除</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const left = remainingDaysFloor(item.purgeDueAt);
            const soon = left <= 7;
            return (
              <tr key={item.id}>
                <td>
                  #{item.id} {item.brand} {item.model}
                </td>
                <td>
                  <span className={item.originalStatus === "draft" ? "tag tag-neutral" : "tag tag-outline"}>
                    {ORIGINAL[item.originalStatus] ?? item.originalStatus}
                  </span>
                </td>
                <td style={soon ? { color: "var(--color-accent-700)" } : undefined}>
                  {item.purgeDueAt.slice(0, 10)}
                  {` · 剩余 ${left} 天`}
                </td>
                <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                  <button type="button" className="btn btn-ghost" onClick={() => void viewDetail(item)}>
                    查看详情
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => void restore(item)}>
                    恢复为草稿
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
      {items.length === 0 ? <p className="page-sub">回收站是空的</p> : null}

      {detailId !== null ? (
        <div className="card elev-sm" style={{ marginTop: 20, gap: 12 }}>
          <span style={{ fontFamily: "var(--font-heading)", fontSize: 17 }}>车辆 #{detailId} 详情（只读）</span>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {detailImages.map((img) => (
              <img
                key={img.id}
                src={img.url}
                alt={img.caption}
                width={76}
                height={57}
                style={{ width: 76, aspectRatio: "4/3", objectFit: "cover", borderRadius: "var(--radius-sm)" }}
              />
            ))}
          </div>
          <span className="page-sub">
            评估报告 {detailReports.length} 份 · 价格记录 {detailPrices.length} 条 · 恢复后进入草稿，可再编辑
          </span>
        </div>
      ) : null}
    </div>
  );
}
