import { go } from "../lib/nav";

export function SiteHeader({ total }: { total?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <a
        className="brand-mark"
        href="/"
        onClick={(e) => {
          e.preventDefault();
          go("/");
        }}
      >
        车行
      </a>
      {typeof total === "number" ? <span className="page-sub">共 {total} 辆</span> : null}
    </div>
  );
}
