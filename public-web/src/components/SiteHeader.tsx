import { go } from "../lib/nav";

export function SiteHeader({ total, loading }: { total?: number; loading?: boolean }) {
  return (
    <header className="site-header site-header-sticky">
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
      {typeof total === "number" ? (
        <span className="page-sub" aria-live="polite">
          {loading ? "加载中…" : `共 ${total} 辆`}
        </span>
      ) : null}
    </header>
  );
}
