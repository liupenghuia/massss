import { useEffect, useState } from "react";
import { api } from "./api";
import { useConfirm } from "./ui/useConfirm";

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

const PAGE_SIZE = 20;

export function RecyclePanel() {
  const { confirm, dialog } = useConfirm();
  const [items, setItems] = useState<RecycleItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [detailImages, setDetailImages] = useState<ImageItem[]>([]);
  const [detailReports, setDetailReports] = useState<ReportItem[]>([]);
  const [detailPrices, setDetailPrices] = useState<PriceRecordItem[]>([]);

  async function load(nextPage = page) {
    setError("");
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(nextPage), pageSize: String(PAGE_SIZE) });
      if (keyword.trim()) qs.set("keyword", keyword.trim());
      const data = await api<{ items: RecycleItem[]; total: number }>(`/admin/recycle-bin?${qs}`);
      setItems(data.items);
      setTotal(data.total);
      setPage(nextPage);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load().catch((err) => setError(err instanceof Error ? err.message : "加载失败"));
  }, []);

  async function viewDetail(item: RecycleItem) {
    setError("");
    setDetailId(item.id);
    setDetailLoading(true);
    setDetailImages([]);
    setDetailReports([]);
    setDetailPrices([]);
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
    } finally {
      setDetailLoading(false);
    }
  }

  async function restore(item: RecycleItem) {
    const ok = await confirm({
      title: "恢复为草稿？",
      body: "车辆会回到草稿，前台仍不可见，可再编辑后发布。",
      confirmLabel: "恢复为草稿",
    });
    if (!ok) return;
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

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      {dialog}
    <div>
      <div className="page-head">
        <div>
          <h2>回收站</h2>
          <p className="page-sub">删除后保留 1 个月，到期自动清除{loading ? " · 加载中…" : ` · 共 ${total} 辆`}</p>
        </div>
        <div className="toolbar">
          <input
            className="input"
            placeholder="品牌 / 车型"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void load(1).catch((err) => setError(err instanceof Error ? err.message : "加载失败"));
              }
            }}
            aria-label="回收站关键字"
          />
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => void load(1).catch((err) => setError(err instanceof Error ? err.message : "加载失败"))}
          >
            筛选
          </button>
        </div>
      </div>
      {error ? (
        <p className="banner banner-warn" role="alert">
          {error}
        </p>
      ) : null}

      {loading && items.length === 0 ? (
        <div className="table-wrap" aria-busy="true" aria-label="加载回收站">
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
              {[0, 1, 2, 3].map((i) => (
                <tr key={i}>
                  <td colSpan={4}>
                    <div className={`skeleton-line skel-row ${["skel-w-70", "skel-w-60", "skel-w-55", "skel-w-45"][i]}`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {!loading && items.length === 0 ? (
        <div className="empty-card">
          <div className="empty-blob" />
          <div className="empty-card-title">
            {keyword.trim() ? "没有匹配的回收站车辆" : "回收站是空的"}
          </div>
          <p className="page-sub">
            {keyword.trim() ? "换个关键字试试。" : "从车辆列表删除的车辆会出现在这里。"}
          </p>
          {keyword.trim() ? (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setKeyword("");
                void load().catch((err) => setError(err instanceof Error ? err.message : "加载失败"));
              }}
            >
              清空关键字
            </button>
          ) : null}
        </div>
      ) : null}

      {items.length > 0 ? (
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
                  <tr key={item.id} className={detailId === item.id ? "table-row-active" : undefined}>
                    <td>
                      #{item.id} {item.brand} {item.model}
                    </td>
                    <td>
                      <span className={item.originalStatus === "draft" ? "tag tag-neutral" : "tag tag-outline"}>
                        {ORIGINAL[item.originalStatus] ?? item.originalStatus}
                      </span>
                    </td>
                    <td className={soon ? "cell-warn" : undefined}>
                      {item.purgeDueAt.slice(0, 10)}
                      {` · 剩余 ${left} 天`}
                    </td>
                    <td className="table-actions">
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
      ) : null}

      {total > 0 ? (
        <div className="pager">
          <button type="button" className="btn btn-ghost" disabled={page <= 1} onClick={() => void load(page - 1)}>
            上一页
          </button>
          <span>{`第 ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} 辆，共 ${total} 辆`}</span>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={page >= totalPages}
            onClick={() => void load(page + 1)}
          >
            下一页
          </button>
        </div>
      ) : null}

      {detailId !== null ? (
        <div className="card elev-sm admin-section-card recycle-detail">
          <div className="card-title-row">
            <span className="form-head-title">车辆 #{detailId} 详情（只读）</span>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setDetailId(null);
                setDetailImages([]);
                setDetailReports([]);
                setDetailPrices([]);
              }}
            >
              关闭
            </button>
          </div>
          {detailLoading ? (
            <p className="page-sub" role="status">
              加载详情…
            </p>
          ) : (
            <>
              <div className="recycle-thumbs">
                {detailImages.length === 0 ? <span className="page-sub">无图片</span> : null}
                {detailImages.map((img) => (
                  <img
                    key={img.id}
                    src={img.url}
                    alt={img.caption || `车辆 ${detailId} 图片`}
                    width={76}
                    height={57}
                    className="recycle-thumb"
                  />
                ))}
              </div>
              <span className="page-sub">
                评估报告 {detailReports.length} 份 · 价格记录 {detailPrices.length} 条 · 恢复后进入草稿，可再编辑
              </span>
            </>
          )}
        </div>
      ) : null}
    </div>
    </>
  );
}
