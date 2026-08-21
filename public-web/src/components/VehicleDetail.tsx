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
      <Gallery
        key={detail.id}
        images={images}
        title={title}
        intro={
          <>
            <h1 className="detail-title">{title}</h1>
            <div className="detail-price">
              <Price value={price} size="lg" />
            </div>
            <div className="spec-2">
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
            {detail.conditionDesc ? <p className="detail-desc">{detail.conditionDesc}</p> : null}
          </>
        }
        footer={
          <>
            {reports.length > 0 ? (
              <section className="detail-block">
                <h2 className="detail-section">评估报告</h2>
                <div className="report-list">
                  {reports.map((r) => (
                    <a key={r.id} href={r.url} target="_blank" rel="noreferrer" className="report-row">
                      <span>{r.url.split("/").pop() || "报告"}</span>
                      <span>{r.uploadedAt.slice(0, 10)}</span>
                    </a>
                  ))}
                </div>
              </section>
            ) : null}
            <section className="detail-block">
              <h2 className="detail-section">价格记录</h2>
              {records.length === 0 ? (
                <p className="page-sub">暂无价格变动记录</p>
              ) : (
                <div className="price-log">
                  {records.map((r) => (
                    <div key={r.id} className="price-log-row">
                      <Price value={r.to} size="sm" />
                      <span className="page-sub">{r.createdAt.slice(0, 10)}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
            <Button variant="ghost" type="button" block className="detail-back" onClick={() => go("/")}>
              返回列表
            </Button>
          </>
        }
      />
    </div>
  );
}
