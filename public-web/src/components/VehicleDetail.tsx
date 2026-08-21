import type { ReactNode } from "react";
import { energyLabel, formatMileage } from "../lib/labels";
import { go } from "../lib/nav";
import type { Detail, ImageItem, PriceRecord, PriceValue, ReportItem } from "../types";
import { Gallery } from "./Gallery";
import { SiteHeader } from "./SiteHeader";
import { Button } from "./ui/Button";
import { Price } from "./ui/Price";

type Props = {
  detail: Detail;
  images: ImageItem[];
  reports: ReportItem[];
  price: PriceValue | null;
  records: PriceRecord[];
};

/** F-002：null / 空字符串隐藏整行；数字 0 保留 */
function SpecItem({ label, children }: { label: string; children: ReactNode }) {
  if (children == null || children === "") return null;
  return (
    <div>
      <div className="spec-k">{label}</div>
      {children}
    </div>
  );
}

function reportLabel(url: string): string {
  try {
    const name = decodeURIComponent(url.split("/").pop() || "");
    return name || "评估报告";
  } catch {
    return "评估报告";
  }
}

export function VehicleDetail({ detail, images, reports, price, records }: Props) {
  const title = `${detail.brand} ${detail.model}`.trim() || "车辆详情";
  return (
    <div className="shell">
      <div className="public-phone" style={{ paddingBottom: 0 }}>
        <SiteHeader />
      </div>
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
              <SpecItem label="上牌年">{detail.registrationYear != null ? `${detail.registrationYear} 年` : null}</SpecItem>
              <SpecItem label="里程">{formatMileage(detail.mileageKm)}</SpecItem>
              <SpecItem label="颜色">{detail.color?.trim() || null}</SpecItem>
              <SpecItem label="过户次数">
                {detail.transferCount != null ? `${detail.transferCount} 次` : null}
              </SpecItem>
              <SpecItem label="能源">{detail.energyType ? energyLabel(detail.energyType) : null}</SpecItem>
              <SpecItem label="排量">
                {detail.displacementL != null ? `${detail.displacementL} 升` : null}
              </SpecItem>
              <SpecItem label="电耗">
                {detail.energyConsumption != null ? String(detail.energyConsumption) : null}
              </SpecItem>
              <SpecItem label="电池">
                {detail.batteryKwh != null ? `${detail.batteryKwh} kWh` : null}
              </SpecItem>
            </div>
            {detail.conditionDesc?.trim() ? <p className="detail-desc">{detail.conditionDesc}</p> : null}
          </>
        }
        footer={
          <>
            {reports.length > 0 ? (
              <section className="detail-block">
                <h2 className="detail-section">评估报告</h2>
                <div className="report-list">
                  {reports.map((r) => (
                    <a
                      key={r.id}
                      href={r.url}
                      target="_blank"
                      rel="noreferrer"
                      className="report-row"
                      onClick={(e) => {
                        // 微信等环境可能拦新标签：失败时保持默认当前页跳转
                        try {
                          const w = window.open(r.url, "_blank", "noopener,noreferrer");
                          if (w) e.preventDefault();
                        } catch {
                          /* 使用默认 <a> 行为 */
                        }
                      }}
                    >
                      <span>{reportLabel(r.url)}</span>
                      <span>{r.uploadedAt.slice(0, 10)}</span>
                    </a>
                  ))}
                </div>
                <p className="page-sub">若无法打开，请在系统浏览器中查看链接。</p>
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
