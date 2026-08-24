export function DetailSkeleton() {
  return (
    <div className="shell" aria-busy="true" aria-label="加载中">
      <div className="public-hero skeleton-block hero-skel" />
      <main className="public-phone">
        <div className="skeleton-line skel-w-55 skel-h-28 skel-mt-8" />
        <div className="skeleton-line skel-w-30 skel-h-22 skel-mt-12" />
        <div className="spec-2 skel-mt-20">
          <div className="skeleton-line" />
          <div className="skeleton-line" />
          <div className="skeleton-line" />
          <div className="skeleton-line" />
        </div>
        <p className="page-sub skel-mt-18">
          加载中…
        </p>
      </main>
    </div>
  );
}
