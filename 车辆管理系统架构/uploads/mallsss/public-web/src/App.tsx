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
type ReportItem = { id: number; url: string; uploadedAt: string };
type PriceRecord = { id: number; from: PriceValue | { type: "unset"; amount: null }; to: PriceValue; createdAt: string };

type Filters = {
  keyword: string;
  priceMin: string;
  priceMax: string;
  registrationYearMin: string;
  registrationYearMax: string;
  mileageKmMin: string;
  mileageKmMax: string;
};

const PAGE_SIZE = 20;

function formatPrice(p: PriceValue | null | { type: string; amount: number | null }): string {
  if (!p || p.type === "negotiable" || p.type === "unset" || p.amount == null) {
    if (p && p.type === "unset") return "未设置";
    return "面议";
  }
  return `${(p.amount / 10000).toFixed(2)} 万`;
}

function parseRoute(): { kind: "list" } | { kind: "detail"; id: number } | { kind: "notfound" } {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  if (path === "/") return { kind: "list" };
  const m = path.match(/^\/vehicles\/(\d+)$/);
  if (m) {
    const id = Number(m[1]);
    if (!Number.isInteger(id) || id < 1) return { kind: "notfound" };
    return { kind: "detail", id };
  }
  return { kind: "notfound" };
}

function filtersFromUrl(): { filters: Filters; page: number } {
  const q = new URLSearchParams(window.location.search);
  const pageRaw = Number(q.get("page") ?? "1");
  const page = Number.isInteger(pageRaw) && pageRaw >= 1 ? pageRaw : 1;
  return {
    page,
    filters: {
      keyword: q.get("keyword") ?? "",
      priceMin: q.get("priceMin") ?? "",
      priceMax: q.get("priceMax") ?? "",
      registrationYearMin: q.get("registrationYearMin") ?? "",
      registrationYearMax: q.get("registrationYearMax") ?? "",
      mileageKmMin: q.get("mileageKmMin") ?? "",
      mileageKmMax: q.get("mileageKmMax") ?? "",
    },
  };
}

function listSearch(filters: Filters, page: number): string {
  const q = new URLSearchParams();
  if (page > 1) q.set("page", String(page));
  (Object.keys(filters) as (keyof Filters)[]).forEach((k) => {
    const v = filters[k].trim();
    if (v) q.set(k, v);
  });
  const s = q.toString();
  return s ? `/?${s}` : "/";
}

function go(url: string): void {
  window.history.pushState({}, "", url);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export default function App() {
  const [route, setRoute] = useState(parseRoute);
  const [items, setItems] = useState<Summary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Filters>(filtersFromUrl().filters);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [price, setPrice] = useState<PriceValue | null>(null);
  const [records, setRecords] = useState<PriceRecord[]>([]);
  const [lightbox, setLightbox] = useState<number | null>(null);

  useEffect(() => {
    const onPop = () => setRoute(parseRoute());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  async function loadList(nextFilters: Filters, nextPage: number) {
    setLoading(true);
    setError("");
    const qs = new URLSearchParams({ page: String(nextPage), pageSize: String(PAGE_SIZE) });
    (Object.keys(nextFilters) as (keyof Filters)[]).forEach((k) => {
      const v = nextFilters[k].trim();
      if (v) qs.set(k, v);
    });
    try {
      const res = await fetch(`/public/vehicles?${qs}`);
      const body = await res.json();
      if (!res.ok) {
        setError("加载失败，请重试");
        setItems([]);
        return;
      }
      setItems(body.items);
      setTotal(body.total);
      setPage(nextPage);
    } catch {
      setError("加载失败，请重试");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (route.kind !== "list") return;
    const fromUrl = filtersFromUrl();
    setFilters(fromUrl.filters);
    void loadList(fromUrl.filters, fromUrl.page);
  }, [route]);

  useEffect(() => {
    if (route.kind !== "detail") {
      setDetail(null);
      return;
    }
    const id = route.id;
    setLoading(true);
    setError("");
    void (async () => {
      try {
        const [dRes, iRes, pRes, rRes, recRes] = await Promise.all([
          fetch(`/public/vehicles/${id}`),
          fetch(`/public/vehicles/${id}/images`),
          fetch(`/public/vehicles/${id}/price`),
          fetch(`/public/vehicles/${id}/reports`),
          fetch(`/public/vehicles/${id}/price-records?page=1&pageSize=100`),
        ]);
        if (!dRes.ok) {
          setDetail(null);
          setError("找不到该车辆");
          return;
        }
        const d: Detail = await dRes.json();
        setDetail(d);
        const imgs = iRes.ok ? await iRes.json() : { items: [] };
        setImages(imgs.items ?? []);
        const p = pRes.ok ? await pRes.json() : { current: null };
        setPrice(p.current ?? null);
        const reps = rRes.ok ? await rRes.json() : { items: [] };
        setReports(reps.items ?? []);
        const rec = recRes.ok ? await recRes.json() : { items: [] };
        setRecords(rec.items ?? []);
        document.title = `${d.brand} ${d.model}`;
        setMeta("og:title", `${d.brand} ${d.model}`);
        setMeta("og:description", `${d.registrationYear}年 ${d.mileageKm}公里 ${d.color}`);
        const cover = (iRes.ok ? imgs.items : [])[0]?.url;
        if (cover) setMeta("og:image", cover);
      } catch {
        setError("加载失败，请重试");
      } finally {
        setLoading(false);
      }
    })();
  }, [route]);

  function submitFilters(e?: FormEvent) {
    e?.preventDefault();
    go(listSearch(filters, 1));
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (route.kind === "notfound" || (route.kind === "detail" && error === "找不到该车辆")) {
    return (
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "1rem", textAlign: "left" }}>
        <p>找不到该车辆</p>
        <button type="button" onClick={() => go("/")}>
          返回列表
        </button>
      </main>
    );
  }

  if (route.kind === "detail" && detail) {
    return (
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "1rem", textAlign: "left" }}>
        <button type="button" onClick={() => go("/")}>
          返回列表
        </button>
        <h1>
          {detail.brand} {detail.model}
        </h1>
        <p>{formatPrice(price)}</p>
        <p>
          {detail.registrationYear} 年上牌 · {detail.mileageKm} 公里 · {detail.color} · 过户 {detail.transferCount} 次
        </p>
        {detail.conditionDesc ? <p>{detail.conditionDesc}</p> : null}
        {detail.displacementL != null ? <p>排量 {detail.displacementL} 升</p> : null}
        {detail.energyConsumption != null ? <p>电耗 {detail.energyConsumption}</p> : null}
        {detail.batteryKwh != null ? <p>电池 {detail.batteryKwh} kWh</p> : null}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {images.map((img, i) => (
            <button key={img.id} type="button" onClick={() => setLightbox(i)} style={{ padding: 0, border: 0, background: "none" }}>
              <img src={img.url} alt={img.caption || ""} width={160} />
              {img.caption ? <span>{img.caption}</span> : null}
            </button>
          ))}
        </div>
        {lightbox !== null && images[lightbox] ? (
          <div
            role="dialog"
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center" }}
            onClick={() => setLightbox(null)}
          >
            <button type="button" onClick={(e) => { e.stopPropagation(); setLightbox(Math.max(0, lightbox - 1)); }}>
              上一张
            </button>
            <img src={images[lightbox].url} alt={images[lightbox].caption || ""} style={{ maxWidth: "80%", maxHeight: "80%" }} />
            <button type="button" onClick={(e) => { e.stopPropagation(); setLightbox(Math.min(images.length - 1, lightbox + 1)); }}>
              下一张
            </button>
          </div>
        ) : null}
        {reports.length > 0 ? (
          <section>
            <h2>评估报告</h2>
            <ul>
              {reports.map((r) => (
                <li key={r.id}>
                  <a href={r.url} target="_blank" rel="noreferrer">
                    {r.url.split("/").pop() || "报告"}
                  </a>{" "}
                  {r.uploadedAt.slice(0, 10)}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {records.length > 0 ? (
          <section>
            <h2>价格记录</h2>
            <ul>
              {records.map((r) => (
                <li key={r.id}>
                  {formatPrice(r.to)} · {r.createdAt.slice(0, 10)}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "1rem", textAlign: "left" }}>
      <h1>在售车辆</h1>
      <form onSubmit={submitFilters}>
        <input placeholder="品牌/车型" value={filters.keyword} onChange={(e) => setFilters({ ...filters, keyword: e.target.value })} />
        <input placeholder="最低价（元）" value={filters.priceMin} onChange={(e) => setFilters({ ...filters, priceMin: e.target.value })} />
        <input placeholder="最高价（元）" value={filters.priceMax} onChange={(e) => setFilters({ ...filters, priceMax: e.target.value })} />
        <input placeholder="上牌年起" value={filters.registrationYearMin} onChange={(e) => setFilters({ ...filters, registrationYearMin: e.target.value })} />
        <input placeholder="上牌年止" value={filters.registrationYearMax} onChange={(e) => setFilters({ ...filters, registrationYearMax: e.target.value })} />
        <input placeholder="里程起" value={filters.mileageKmMin} onChange={(e) => setFilters({ ...filters, mileageKmMin: e.target.value })} />
        <input placeholder="里程止" value={filters.mileageKmMax} onChange={(e) => setFilters({ ...filters, mileageKmMax: e.target.value })} />
        <button type="submit">筛选</button>
        <button
          type="button"
          onClick={() => {
            const empty: Filters = {
              keyword: "",
              priceMin: "",
              priceMax: "",
              registrationYearMin: "",
              registrationYearMax: "",
              mileageKmMin: "",
              mileageKmMax: "",
            };
            setFilters(empty);
            go("/");
          }}
        >
          清空
        </button>
      </form>
      {error ? (
        <p>
          {error}{" "}
          <button type="button" onClick={() => void loadList(filters, page)}>
            重试
          </button>
        </p>
      ) : null}
      {!loading && total === 0 && !error ? <p>暂无在售车辆</p> : <p>共 {total} 辆</p>}
      <ul style={{ listStyle: "none", padding: 0 }}>
        {items.map((v) => (
          <li key={v.id} style={{ marginBottom: "1rem", borderBottom: "1px solid #ddd", paddingBottom: "0.5rem" }}>
            <a
              href={`/vehicles/${v.id}`}
              onClick={(e) => {
                e.preventDefault();
                go(`/vehicles/${v.id}`);
              }}
            >
              {v.coverImageUrl ? <img src={v.coverImageUrl} alt="" width={120} /> : null}
              <strong>
                {v.brand} {v.model}
              </strong>
              <span>
                {" "}
                {v.registrationYear} · {v.mileageKm} km · {formatPrice(v.currentPrice)}
              </span>
            </a>
          </li>
        ))}
      </ul>
      {totalPages > 1 ? (
        <p>
          <button type="button" disabled={page <= 1} onClick={() => go(listSearch(filters, page - 1))}>
            上一页
          </button>
          {page} / {totalPages}
          <button type="button" disabled={page >= totalPages} onClick={() => go(listSearch(filters, page + 1))}>
            下一页
          </button>
        </p>
      ) : null}
    </main>
  );
}

function setMeta(property: string, content: string): void {
  let el = document.querySelector(`meta[property="${property}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("property", property);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}
