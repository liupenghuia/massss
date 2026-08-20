import { useEffect, useRef, useState, type TouchEvent } from "react";
import type { ImageItem } from "../types";
import { Button } from "./ui/Button";
import { SmartImage } from "./ui/SmartImage";

export function Gallery({ images, title }: { images: ImageItem[]; title: string }) {
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const touchX = useRef<number | null>(null);
  const current = images[active] ?? null;
  const extra = Math.max(0, images.length - 6);

  useEffect(() => {
    if (!lightbox) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLightbox(false);
      if (e.key === "ArrowLeft") setActive((i) => Math.max(0, i - 1));
      if (e.key === "ArrowRight") setActive((i) => Math.min(images.length - 1, i + 1));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, images.length]);

  function onTouchStart(e: TouchEvent) {
    touchX.current = e.changedTouches[0]?.clientX ?? null;
  }
  function onTouchEnd(e: TouchEvent) {
    const start = touchX.current;
    touchX.current = null;
    const end = e.changedTouches[0]?.clientX;
    if (start == null || end == null) return;
    const delta = end - start;
    if (delta > 48) setActive((i) => Math.max(0, i - 1));
    if (delta < -48) setActive((i) => Math.min(images.length - 1, i + 1));
  }

  return (
    <div>
      <button
        type="button"
        className="public-hero"
        style={{ width: "100%", border: 0, padding: 16 }}
        onClick={() => current && setLightbox(true)}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {current ? (
          <SmartImage src={current.url} alt={current.caption || title} priority className="public-hero-img" />
        ) : (
          <span className="page-sub">暂无图片</span>
        )}
        {images.length > 0 ? (
          <span className="tag tag-neutral" style={{ position: "relative", zIndex: 1 }}>
            {active + 1} / {images.length}
          </span>
        ) : null}
      </button>

      {images.length > 0 ? (
        <div className="gallery-thumbs">
          <div style={{ fontFamily: "var(--font-heading)", fontSize: 18 }}>车辆图片</div>
          <div className="photo-grid" style={{ marginTop: 10 }}>
            {images.slice(0, 6).map((img, i) => (
              <button
                key={img.id}
                type="button"
                className="photo-cell"
                onClick={() => {
                  setActive(i);
                  setLightbox(true);
                }}
              >
                {i === 5 && extra > 0 ? (
                  <span>+{extra}</span>
                ) : (
                  <SmartImage src={img.url} alt={img.caption || `${title} ${i + 1}`} sizes="33vw" />
                )}
              </button>
            ))}
          </div>
          {current?.caption ? <p className="page-sub">图片说明：{current.caption}</p> : null}
        </div>
      ) : null}

      {lightbox && current ? (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label="车辆图片" onClick={() => setLightbox(false)}>
          <img src={current.url} alt={current.caption || title} onClick={(e) => e.stopPropagation()} />
          <div style={{ display: "flex", justifyContent: "space-between", width: "100%", maxWidth: 420 }}>
            <Button
              variant="ghost"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActive((i) => Math.max(0, i - 1));
              }}
            >
              上一张
            </Button>
            <span>
              {active + 1} / {images.length}
            </span>
            <Button
              variant="ghost"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActive((i) => Math.min(images.length - 1, i + 1));
              }}
            >
              下一张
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
