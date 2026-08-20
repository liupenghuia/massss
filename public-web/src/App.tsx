import { useEffect, useState, type FormEvent } from "react";

type PriceValue = { type: "amount"; amount: number } | { type: "negotiable"; amount: null };

type Summary = {
  id: number;
  brand: string;
  model: string;
  registrationYear: number;
  mileageKm: number;
  color: string;
  energyType: string;
  coverImageUrl: string | null;
  currentPrice: PriceValue;
};

type Detail = {
  id: number;
  brand: string;
  model: string;
  registrationYear: number;
  mileageKm: number;
  color: string;
  conditionDesc: string;
  energyType: string;
  transferCount: number;
  displacementL: number | null;
  energyConsumption: number | null;
  batteryKwh: number | null;
};

type ImageItem = { id: number; url: string; caption: string };

function formatPrice(p: PriceValue | null): string {
  if (!p) return "价格未公布";
  if (p.type === "negotiable" || p.amount === null) return "价格面谈";
  return `${p.amount.toFixed(2)} 元`;
}

export default function App() {
  const [items, setItems] = useState<Summary[]>([]);
  const [total, setTotal] = useState(0);
  const [keyword, setKeyword] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [price, setPrice] = useState<PriceValue | null>(null);

  async function loadList(e?: FormEvent) {
    e?.preventDefault();
    setError("");
    const qs = new URLSearchParams({ page: "1", pageSize: "20" });
    if (keyword.trim()) qs.set("keyword", keyword.trim());
    if (priceMin) qs.set("priceMin", priceMin);
    if (priceMax) qs.set("priceMax", priceMax);
    const res = await fetch(`/public/vehicles?${qs}`);
    const body = await res.json();
    if (!res.ok) {
      setError(body.message || "加载失败");
      return;
    }
    setItems(body.items);
    setTotal(body.total);
  }

  useEffect(() => {
    void loadList();
  }, []);

  useEffect(() => {
    if (selectedId === null) {
      setDetail(null);
      return;
    }
    void (async () => {
      setError("");
      const [dRes, iRes, pRes] = await Promise.all([
        fetch(`/public/vehicles/${selectedId}`),
        fetch(`/public/vehicles/${selectedId}/images`),
        fetch(`/public/vehicles/${selectedId}/price`),
      ]);
      if (!dRes.ok) {
        setError("车辆不存在或已下架");
        setSelectedId(null);
        return;
      }
      setDetail(await dRes.json());
      const imgs = await iRes.json();
      setImages(imgs.items ?? []);
      const p = await pRes.json();
      setPrice(p.current ?? null);
    })();
  }, [selectedId]);

  if (detail && selectedId !== null) {
    return (
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "1rem", textAlign: "left" }}>
        <button type="button" onClick={() => setSelectedId(null)}>
          返回列表
        </button>
        <h1>
          {detail.brand} {detail.model}
        </h1>
        <p>{formatPrice(price)}</p>
        <p>
          {detail.registrationYear} 年上牌 · {detail.mileageKm} 公里 · {detail.color} · 过户 {detail.transferCount} 次
        </p>
        <p>{detail.conditionDesc}</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {images.map((img) => (
            <img key={img.id} src={img.url} alt={img.caption} width={160} />
          ))}
        </div>
        {error ? <p>{error}</p> : null}
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "1rem", textAlign: "left" }}>
      <h1>在售车辆</h1>
      <form onSubmit={(e) => void loadList(e)}>
        <input placeholder="品牌/车型" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
        <input placeholder="最低价" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} />
        <input placeholder="最高价" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} />
        <button type="submit">筛选</button>
      </form>
      {error ? <p>{error}</p> : null}
      <p>共 {total} 辆</p>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {items.map((v) => (
          <li key={v.id} style={{ marginBottom: "1rem", borderBottom: "1px solid #ddd", paddingBottom: "0.5rem" }}>
            <button type="button" onClick={() => setSelectedId(v.id)} style={{ all: "unset", cursor: "pointer" }}>
              {v.coverImageUrl ? <img src={v.coverImageUrl} alt="" width={120} /> : null}
              <strong>
                {v.brand} {v.model}
              </strong>
              <span>
                {" "}
                {v.registrationYear} · {v.mileageKm} km · {formatPrice(v.currentPrice)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
