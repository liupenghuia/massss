import { energyLabel, formatMileage } from "../../lib/labels";
import { go } from "../../lib/nav";
import type { Summary } from "../../types";
import { Price } from "./Price";
import { SmartImage } from "./SmartImage";

export function VehicleCard({ vehicle }: { vehicle: Summary }) {
  const title = `${vehicle.brand} ${vehicle.model}`.trim() || "车辆";
  const meta = [
    vehicle.registrationYear ? `${vehicle.registrationYear}` : null,
    formatMileage(vehicle.mileageKm).replace(" 公里", " km"),
    vehicle.color?.trim() || null,
    vehicle.energyType ? energyLabel(vehicle.energyType) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <article className="card elev-sm vehicle-card">
      <a
        href={`/vehicles/${vehicle.id}`}
        onClick={(e) => {
          e.preventDefault();
          go(`/vehicles/${vehicle.id}`);
        }}
        className="link-reset"
      >
        <SmartImage
          src={vehicle.coverImageUrl}
          alt={title}
          mono={vehicle.brand}
          sizes="(min-width: 720px) 50vw, 100vw"
          className="vehicle-card-cover"
        />
        <div className="vehicle-card-body">
          <div className="vehicle-card-title">{title}</div>
          {meta ? <div className="page-sub">{meta}</div> : null}
          <Price value={vehicle.currentPrice} size="md" />
        </div>
      </a>
    </article>
  );
}
