export function DetailSkeleton() {
  return (
    <div className="shell" aria-busy="true" aria-label="加载中">
      <div className="public-hero skeleton-block" style={{ height: 220, borderRadius: 0 }} />
      <main className="public-phone">
        <div className="skeleton-line" style={{ width: "55%", height: 28, marginTop: 8 }} />
        <div className="skeleton-line" style={{ width: "30%", height: 22, marginTop: 12 }} />
        <div className="spec-2" style={{ marginTop: 20 }}>
          <div className="skeleton-line" />
          <div className="skeleton-line" />
          <div className="skeleton-line" />
          <div className="skeleton-line" />
        </div>
        <p className="page-sub" style={{ marginTop: 18 }}>
          加载中…
        </p>
      </main>
    </div>
  );
}
