import { energyLabel, formatMileage } from "../../lib/labels";
import { go } from "../../lib/nav";
import type { Summary } from "../../types";
import { Price } from "./Price";
import { SmartImage } from "./SmartImage";

export function VehicleCard({ vehicle }: { vehicle: Summary }) {
  const title = `${vehicle.brand} ${vehicle.model}`;
  return (
    <article className="card elev-sm vehicle-card" style={{ cursor: "pointer" }}>
      <a
        href={`/vehicles/${vehicle.id}`}
        onClick={(e) => {
          e.preventDefault();
          go(`/vehicles/${vehicle.id}`);
        }}
        style={{ color: "inherit", textDecoration: "none" }}
      >
        <SmartImage src={vehicle.coverImageUrl} alt={title} sizes="(min-width: 640px) 50vw, 100vw" className="vehicle-card-cover" />
        <div className="vehicle-card-body">
          <div className="vehicle-card-title">{title}</div>
          <div className="page-sub">
            {vehicle.registrationYear} · {formatMileage(vehicle.mileageKm).replace(" 公里", " km")} · {vehicle.color}
            {vehicle.energyType ? ` · ${energyLabel(vehicle.energyType)}` : ""}
          </div>
          <Price value={vehicle.currentPrice} size="md" />
        </div>
      </a>
    </article>
  );
}
