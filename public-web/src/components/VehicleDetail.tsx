import { energyLabel, formatMileage } from "../lib/labels";
import { go } from "../lib/nav";
import type { Detail, ImageItem, PriceRecord, PriceValue, ReportItem } from "../types";
import { Gallery } from "./Gallery";
import { Button } from "./ui/Button";
import { Price } from "./ui/Price";

type Props = {
  detail: Detail;
  images: ImageItem[];
  reports: ReportItem[];
  price: PriceValue | null;
  records: PriceRecord[];
};

export function VehicleDetail({ detail, images, reports, price, records }: Props) {
  const title = `${detail.brand} ${detail.model}`;
  return (
    <div className="shell">
      <Gallery key={detail.id} images={images} title={title} />
      <main className="public-phone" style={{ paddingTop: 22 }}>
        <h1 style={{ margin: 0 }}>{title}</h1>
        <div style={{ marginTop: 6 }}>
          <Price value={price} size="lg" />
        </div>
        <div className="spec-2" style={{ marginTop: 18 }}>
          <div>
            <div className="spec-k">上牌年</div>
            {detail.registrationYear} 年
          </div>
          <div>
            <div className="spec-k">里程</div>
            {formatMileage(detail.mileageKm)}
          </div>
          <div>
            <div className="spec-k">颜色</div>
            {detail.color}
          </div>
          <div>
            <div className="spec-k">过户次数</div>
            {detail.transferCount} 次
          </div>
          <div>
            <div className="spec-k">能源</div>
            {energyLabel(detail.energyType)}
          </div>
          {detail.displacementL != null ? (
            <div>
              <div className="spec-k">排量</div>
              {detail.displacementL} 升
            </div>
          ) : null}
          {detail.energyConsumption != null ? (
            <div>
              <div className="spec-k">电耗</div>
              {detail.energyConsumption}
            </div>
          ) : null}
          {detail.batteryKwh != null ? (
            <div>
              <div className="spec-k">电池</div>
              {detail.batteryKwh} kWh
            </div>
          ) : null}
        </div>
        {detail.conditionDesc ? <p style={{ marginTop: 18, lineHeight: 1.7 }}>{detail.conditionDesc}</p> : null}

        {reports.length > 0 ? (
          <section style={{ marginTop: 18 }}>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: 18 }}>评估报告</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
              {reports.map((r) => (
                <a key={r.id} href={r.url} target="_blank" rel="noreferrer" className="banner banner-ok" style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>{r.url.split("/").pop() || "报告"}</span>
                  <span>{r.uploadedAt.slice(0, 10)}</span>
                </a>
              ))}
            </div>
          </section>
        ) : null}

        {records.length > 0 ? (
          <section style={{ marginTop: 18 }}>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: 18 }}>价格记录</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10, fontSize: 14 }}>
              {records.map((r) => (
                <div key={r.id} style={{ display: "flex", justifyContent: "space-between" }}>
                  <Price value={r.to} size="sm" />
                  <span className="page-sub">{r.createdAt.slice(0, 10)}</span>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <Button variant="ghost" type="button" block onClick={() => go("/")} style={{ marginTop: 18 }}>
          返回列表
        </Button>
      </main>
    </div>
  );
}
