export function DetailSkeleton() {
  return (
    <div className="shell" aria-busy="true" aria-label="加载中">
      <div className="public-hero" />
      <main className="public-phone">
        <p className="page-sub">加载中…</p>
      </main>
    </div>
  );
}
