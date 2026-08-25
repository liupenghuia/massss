import { energyLabel, formatMileage } from "../../lib/labels";
import { go } from "../../lib/nav";
import type { Summary } from "../../types";
import { Price } from "./Price";
import { SmartImage } from "./SmartImage";

export function VehicleCard({ vehicle }: { vehicle: Summary }) {
  const title = `${vehicle.brand || ""} ${vehicle.model || ""}`.trim() || "（未填品牌车型）";
  const meta = [
    vehicle.registrationYear ? String(vehicle.registrationYear) : "—",
    vehicle.mileageKm != null ? formatMileage(vehicle.mileageKm).replace(" 公里", " km") : "—",
    vehicle.color?.trim() || "—",
    vehicle.energyType ? energyLabel(vehicle.energyType) : "—",
  ].join(" · ");

  return (
    <article className="card elev-sm vehicle-card">
      <a
        href={`/vehicles/${vehicle.id}`}
        onClick={(e) => {
          e.preventDefault();
          go(`/vehicles/${vehicle.id}`);
        }}
        className="link-reset vehicle-card-link"
      >
        <div className="vehicle-card-cover">
          <SmartImage
            src={vehicle.coverImageUrl}
            alt={title}
            mono={vehicle.brand}
            sizes="(min-width: 720px) 50vw, 120px"
          />
        </div>
        <div className="vehicle-card-body">
          <div className="vehicle-card-title">{title}</div>
          <div className="page-sub vehicle-card-meta">{meta}</div>
          <Price value={vehicle.currentPrice} size="md" />
        </div>
      </a>
    </article>
  );
}
