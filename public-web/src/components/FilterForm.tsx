import { useState, type FormEvent } from "react";
import type { Filters } from "../types";
import { Button } from "./ui/Button";
import { Tag } from "./ui/Tag";

type Props = {
  filters: Filters;
  onChange: (next: Filters) => void;
  onSubmit: (e?: FormEvent) => void;
  onReset: () => void;
};

type Panel = "price" | "year" | "mileage" | null;

export function FilterForm({ filters, onChange, onSubmit, onReset }: Props) {
  const [panel, setPanel] = useState<Panel>(null);

  function set<K extends keyof Filters>(key: K, value: string) {
    onChange({ ...filters, [key]: value });
  }

  const priceChip =
    filters.priceMin || filters.priceMax
      ? `${filters.priceMin || "?"}–${filters.priceMax || "?"} 元`
      : null;
  const yearChip =
    filters.registrationYearMin || filters.registrationYearMax
      ? `${filters.registrationYearMin || "?"}–${filters.registrationYearMax || "?"} 年`
      : null;
  const mileageChip =
    filters.mileageKmMin || filters.mileageKmMax
      ? `${filters.mileageKmMin || "?"}–${filters.mileageKmMax || "?"} km`
      : null;

  return (
    <form onSubmit={onSubmit}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <label className="field" style={{ flex: 1, margin: 0 }}>
          <span className="visually-hidden">品牌 / 车型</span>
          <input
            id="keyword"
            className="input"
            placeholder="品牌 / 车型"
            value={filters.keyword}
            onChange={(e) => set("keyword", e.target.value)}
          />
        </label>
        <Button variant="primary" type="submit">
          筛选
        </Button>
      </div>
      <div className="chip-row" style={{ marginTop: 8 }}>
        {priceChip ? (
          <Tag
            tone="accent"
            onRemove={() => {
              onChange({ ...filters, priceMin: "", priceMax: "" });
            }}
          >
            {priceChip}
          </Tag>
        ) : (
          <button type="button" className="tag tag-outline" onClick={() => setPanel(panel === "price" ? null : "price")}>
            价格
          </button>
        )}
        {yearChip ? (
          <Tag
            tone="accent"
            onRemove={() => onChange({ ...filters, registrationYearMin: "", registrationYearMax: "" })}
          >
            {yearChip}
          </Tag>
        ) : (
          <button type="button" className="tag tag-outline" onClick={() => setPanel(panel === "year" ? null : "year")}>
            上牌年
          </button>
        )}
        {mileageChip ? (
          <Tag tone="accent" onRemove={() => onChange({ ...filters, mileageKmMin: "", mileageKmMax: "" })}>
            {mileageChip}
          </Tag>
        ) : (
          <button type="button" className="tag tag-outline" onClick={() => setPanel(panel === "mileage" ? null : "mileage")}>
            里程
          </button>
        )}
        <button type="button" className="btn btn-ghost" onClick={onReset}>
          清空
        </button>
      </div>
      {panel === "price" ? (
        <div className="toolbar" style={{ marginTop: 10 }}>
          <input className="input" placeholder="最低价（元）" value={filters.priceMin} onChange={(e) => set("priceMin", e.target.value)} />
          <input className="input" placeholder="最高价（元）" value={filters.priceMax} onChange={(e) => set("priceMax", e.target.value)} />
        </div>
      ) : null}
      {panel === "year" ? (
        <div className="toolbar" style={{ marginTop: 10 }}>
          <input className="input" placeholder="上牌年起" value={filters.registrationYearMin} onChange={(e) => set("registrationYearMin", e.target.value)} />
          <input className="input" placeholder="上牌年止" value={filters.registrationYearMax} onChange={(e) => set("registrationYearMax", e.target.value)} />
        </div>
      ) : null}
      {panel === "mileage" ? (
        <div className="toolbar" style={{ marginTop: 10 }}>
          <input className="input" placeholder="里程起" value={filters.mileageKmMin} onChange={(e) => set("mileageKmMin", e.target.value)} />
          <input className="input" placeholder="里程止" value={filters.mileageKmMax} onChange={(e) => set("mileageKmMax", e.target.value)} />
        </div>
      ) : null}
    </form>
  );
}
