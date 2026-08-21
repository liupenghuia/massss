import { useEffect, useState, type FormEvent } from "react";
import { DetailSkeleton } from "./components/DetailSkeleton";
import { NotFound } from "./components/NotFound";
import { VehicleDetail } from "./components/VehicleDetail";
import { VehicleList } from "./components/VehicleList";
import { filtersFromUrl, go, listSearch, parseRoute } from "./lib/nav";
import type { Detail, Filters, ImageItem, PriceRecord, PriceValue, ReportItem, Summary } from "./types";

const PAGE_SIZE = 20;

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
    document.title = "在售车辆";
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
          setError("该车辆不存在或已下架");
          document.title = "该车辆不存在或已下架";
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

  if (route.kind === "notfound" || (route.kind === "detail" && error === "该车辆不存在或已下架")) {
    return <NotFound />;
  }

  if (route.kind === "detail" && loading && !detail) {
    return <DetailSkeleton />;
  }

  if (route.kind === "detail" && detail) {
    return (
      <VehicleDetail detail={detail} images={images} reports={reports} price={price} records={records} />
    );
  }

  return (
    <VehicleList
      items={items}
      total={total}
      page={page}
      totalPages={totalPages}
      filters={filters}
      loading={loading}
      error={error}
      onFiltersChange={setFilters}
      onSubmit={submitFilters}
      onRetry={() => void loadList(filters, page)}
    />
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