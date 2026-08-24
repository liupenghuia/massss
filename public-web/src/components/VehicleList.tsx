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

function hasActiveFilters(filters: Filters): boolean {
  return Object.values(filters).some((v) => v.trim().length > 0);
}

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
  const filtered = hasActiveFilters(filters);

  return (
    <div className="shell">
      <main className="public-phone">
        <SiteHeader total={total} loading={loading} />
        <h1 className="public-list-title" id="public-list-heading">
          在售车辆
        </h1>
        <div className="stack-gap">
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
          <div className="banner banner-warn stack-gap" role="alert">
            <p className="tight-lead">{error}</p>
            <Button variant="secondary" type="button" onClick={onRetry}>
              重试
            </Button>
          </div>
        ) : null}

        {loading && items.length === 0 ? (
          <div className="public-list-stack" aria-busy="true" aria-label="加载中">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="card elev-sm skel-block">
                <div className="skeleton-block" />
                <div className="skel-body">
                  <div className="skeleton-line skel-w-60" />
                  <div className="skeleton-line skel-w-80" />
                  <div className="skeleton-line skel-w-40" />
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {!loading && total === 0 && !error ? (
          <div className="empty-card">
            <div className="empty-blob" />
            <div className="empty-card-title">
              {filtered ? "没有符合条件的车辆" : "暂无在售车辆"}
            </div>
            <p className="page-sub">
              {filtered ? "换个筛选条件再看看，或清空后查看全部在售。" : "稍后再来看看，新车上架会显示在这里。"}
            </p>
            {filtered ? (
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
            ) : null}
          </div>
        ) : null}

        {items.length > 0 ? (
          <div className="public-list-stack">
            {items.map((v) => (
              <VehicleCard key={v.id} vehicle={v} />
            ))}
          </div>
        ) : null}

        {totalPages > 1 ? (
          <div className="pager">
            <Button variant="ghost" type="button" disabled={page <= 1 || loading} onClick={() => go(listSearch(filters, page - 1))}>
              上一页
            </Button>
            <span className="page-sub">
              {page} / {totalPages}
            </span>
            <Button
              variant="secondary"
              type="button"
              disabled={page >= totalPages || loading}
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
