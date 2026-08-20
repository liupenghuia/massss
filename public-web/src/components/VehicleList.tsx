import type { FormEvent } from "react";
import { emptyFilters, go, listSearch } from "../lib/nav";
import type { Filters, Summary } from "../types";
import { FilterForm } from "./FilterForm";
import { SiteHeader } from "./SiteHeader";
import { Button } from "./ui/Button";
import { VehicleCard } from "./ui/VehicleCard";

type Props = {
  items: Summary[];
  total: number;
  page: number;
  totalPages: number;
  filters: Filters;
  loading: boolean;
  error: string;
  onFiltersChange: (next: Filters) => void;
  onSubmit: (e?: FormEvent) => void;
  onRetry: () => void;
};

export function VehicleList({
  items,
  total,
  page,
  totalPages,
  filters,
  loading,
  error,
  onFiltersChange,
  onSubmit,
  onRetry,
}: Props) {
  return (
    <div className="shell">
      <main className="public-phone">
        <SiteHeader total={total} />
        <h1 style={{ margin: "16px 0 0" }}>在售车辆</h1>
        <div style={{ marginTop: 16 }}>
          <FilterForm
            filters={filters}
            onChange={onFiltersChange}
            onSubmit={onSubmit}
            onReset={() => {
              onFiltersChange(emptyFilters());
              go("/");
            }}
          />
        </div>

        {error ? (
          <div className="banner banner-warn" style={{ marginTop: 16 }}>
            <p>{error}</p>
            <Button variant="secondary" type="button" onClick={onRetry}>
              重试
            </Button>
          </div>
        ) : null}

        {loading && items.length === 0 ? <p className="page-sub">加载中…</p> : null}

        {!loading && total === 0 && !error ? (
          <div className="empty-card" style={{ marginTop: 24 }}>
            <div className="empty-blob" />
            <div style={{ fontFamily: "var(--font-heading)", fontSize: 20 }}>暂无在售车辆</div>
            <p className="page-sub">换个筛选条件再看看，或稍后回来。</p>
            <Button
              variant="secondary"
              type="button"
              onClick={() => {
                onFiltersChange(emptyFilters());
                go("/");
              }}
            >
              清空筛选
            </Button>
          </div>
        ) : null}

        {items.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 20 }}>
            {items.map((v) => (
              <VehicleCard key={v.id} vehicle={v} />
            ))}
          </div>
        ) : null}

        {totalPages > 1 ? (
          <div className="pager">
            <Button variant="ghost" type="button" disabled={page <= 1} onClick={() => go(listSearch(filters, page - 1))}>
              上一页
            </Button>
            <span>
              {page} / {totalPages}
            </span>
            <Button
              variant="secondary"
              type="button"
              disabled={page >= totalPages}
              onClick={() => go(listSearch(filters, page + 1))}
            >
              下一页
            </Button>
          </div>
        ) : null}
      </main>
    </div>
  );
}
