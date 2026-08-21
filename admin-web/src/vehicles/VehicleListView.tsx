import { brandMono, statusTag, ThumbPreview } from "./helpers";
import { STATUS_LABEL, type AdminVehicle, type Status } from "./types";

export type VehicleListViewProps = {
  items: AdminVehicle[];
  total: number;
  page: number;
  totalPages: number;
  status: Status | "";
  q: string;
  listLoading: boolean;
  error: string;
  info: string;
  covers: Record<number, string>;
  onStatusChange: (status: Status | "") => void;
  onQChange: (q: string) => void;
  onFilter: () => void;
  onClearFilters: () => void;
  onOpen: (v: AdminVehicle) => void;
  onCreate: () => void;
  onPage: (page: number) => void;
};

export function VehicleListView(p: VehicleListViewProps) {
  const hasFilters = Boolean(p.status || p.q.trim());

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>车辆</h2>
          <p className="page-sub">{p.listLoading ? "加载中…" : `共 ${p.total} 辆`}</p>
        </div>
        <div className="toolbar">
          <div className="seg" role="group" aria-label="按状态筛选">
            {(
              [
                ["", "全部状态"],
                ["draft", "草稿"],
                ["published", "已上架"],
                ["unpublished", "已下架"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={label}
                type="button"
                className="seg-opt"
                aria-pressed={p.status === value}
                onClick={() => p.onStatusChange(value)}
              >
                {label}
              </button>
            ))}
          </div>
          <input
            className="input"
            placeholder="品牌 / 车型 / VIN 后六位"
            value={p.q}
            onChange={(e) => p.onQChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                p.onFilter();
              }
            }}
            aria-label="关键字搜索"
          />
          <button type="button" className="btn btn-secondary" onClick={p.onFilter}>
            筛选
          </button>
          <button type="button" className="btn btn-primary" onClick={p.onCreate}>
            新建车辆
          </button>
        </div>
      </div>
      {p.error ? (
        <p className="banner banner-warn" role="alert">
          {p.error}
        </p>
      ) : null}
      {p.info ? (
        <p className="banner banner-ok" role="status">
          {p.info}
        </p>
      ) : null}
      {p.listLoading && p.items.length === 0 ? (
        <ul className="vehicle-grid" aria-busy="true" aria-label="加载车辆列表">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <li key={i}>
              <div className="card elev-sm vehicle-card vehicle-card-skeleton">
                <div className="skeleton-block vehicle-card-cover" />
                <div className="vehicle-card-body">
                  <div className="skeleton-line" style={{ width: "70%" }} />
                  <div className="skeleton-line" style={{ width: "90%" }} />
                  <div className="skeleton-line" style={{ width: "45%" }} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      {!p.listLoading && p.items.length === 0 ? (
        <div className="empty-card">
          <div className="empty-blob" />
          <div className="empty-card-title">
            {hasFilters ? "没有符合条件的车辆" : "暂无车辆"}
          </div>
          <p className="page-sub">
            {hasFilters ? "换个筛选条件再看看，或清空后查看全部。" : "点击右上角新建第一台车。"}
          </p>
          {hasFilters ? (
            <button type="button" className="btn btn-secondary" onClick={p.onClearFilters}>
              清空筛选
            </button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={p.onCreate}>
              新建车辆
            </button>
          )}
        </div>
      ) : null}
      {p.items.length > 0 ? (
        <ul className="vehicle-grid">
          {p.items.map((v) => {
            const cover = p.covers[v.id];
            return (
              <li key={v.id}>
                <button type="button" className="card elev-sm vehicle-card" onClick={() => p.onOpen(v)}>
                  {cover ? (
                    <div className="vehicle-card-cover">
                      <ThumbPreview src={cover} alt={`${v.brand} ${v.model}`} />
                    </div>
                  ) : (
                    <div className="vehicle-card-cover vehicle-card-cover-mono" aria-hidden="true">
                      {brandMono(v.brand)}
                    </div>
                  )}
                  <div className="vehicle-card-body">
                    <div className="card-title-row">
                      <span className="vehicle-card-title">
                        {v.brand || "（未填品牌）"} {v.model || ""}
                      </span>
                      <span className={statusTag(v.status)}>{STATUS_LABEL[v.status]}</span>
                    </div>
                    <div className="page-sub">
                      #{v.id} · {v.registrationYear || "—"} 年 · {(v.mileageKm ?? 0).toLocaleString("zh-CN")} 公里
                      {v.vinMasked ? ` · ${v.vinMasked}` : ""}
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
      {p.totalPages > 1 ? (
        <div className="pager">
          <button type="button" className="btn btn-ghost" disabled={p.page <= 1} onClick={() => p.onPage(p.page - 1)}>
            上一页
          </button>
          <span>
            {p.page} / {p.totalPages}
          </span>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={p.page >= p.totalPages}
            onClick={() => p.onPage(p.page + 1)}
          >
            下一页
          </button>
        </div>
      ) : null}
    </div>
  );
}
