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
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "恢复失败");
    }
  }

  return (
    <section>
      <h2>回收站</h2>
      {error ? <p role="alert">{error}</p> : null}
      <input placeholder="品牌/车型" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
      <button type="button" onClick={() => void load()}>
        筛选
      </button>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            #{item.id} {item.brand} {item.model} · 原状态 {item.originalStatus} · 到期 {item.purgeDueAt}
            <button type="button" onClick={() => void viewDetail(item)}>
              查看详情
            </button>
            <button type="button" onClick={() => void restore(item)}>
              恢复为草稿
            </button>
          </li>
        ))}
      </ul>

      {detailId !== null ? (
        <div>
          <h3>车辆 #{detailId} 详情（只读）</h3>
          <p>图片</p>
          <ul>
            {detailImages.map((img) => (
              <li key={img.id}>
                <img src={img.url} alt={img.caption} width={80} />
              </li>
            ))}
          </ul>
          <p>评估报告</p>
          <ul>
            {detailReports.map((r) => (
              <li key={r.id}>
                <a href={r.url} target="_blank" rel="noreferrer">
                  {r.contentType} · {(r.byteSize / 1024).toFixed(0)} KB
                </a>
              </li>
            ))}
          </ul>
          <p>价格历史</p>
          <ul>
            {detailPrices.map((p) => (
              <li key={p.id}>
                {p.createdAt}：
                {p.from.type === "amount" ? `${(p.from.amount / 10000).toFixed(2)} 万` : "面议"} →{" "}
                {p.to.type === "amount" ? `${(p.to.amount / 10000).toFixed(2)} 万` : "面议"}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
