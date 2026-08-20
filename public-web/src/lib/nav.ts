import { EMPTY_FILTERS, type Filters } from "../types";

export function parseRoute(): { kind: "list" } | { kind: "detail"; id: number } | { kind: "notfound" } {
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

export function filtersFromUrl(): { filters: Filters; page: number } {
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

export function listSearch(filters: Filters, page: number): string {
  const q = new URLSearchParams();
  if (page > 1) q.set("page", String(page));
  (Object.keys(filters) as (keyof Filters)[]).forEach((k) => {
    const v = filters[k].trim();
    if (v) q.set(k, v);
  });
  const s = q.toString();
  return s ? `/?${s}` : "/";
}

export function go(url: string): void {
  window.history.pushState({}, "", url);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function emptyFilters(): Filters {
  return { ...EMPTY_FILTERS };
}
