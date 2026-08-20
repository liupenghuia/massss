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

export function RecyclePanel() {
  const [items, setItems] = useState<RecycleItem[]>([]);
  const [keyword, setKeyword] = useState("");
  const [error, setError] = useState("");

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
            <button type="button" onClick={() => void restore(item)}>
              恢复为草稿
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
