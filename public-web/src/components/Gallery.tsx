import { useEffect, useRef, useState, type ReactNode, type TouchEvent } from "react";
import type { ImageItem } from "../types";
import { Button } from "./ui/Button";
import { SmartImage } from "./ui/SmartImage";

type Props = {
  images: ImageItem[];
  title: string;
  intro?: ReactNode;
  footer?: ReactNode;
};

export function Gallery({ images, title, intro, footer }: Props) {
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

  function openAt(index: number) {
    setActive(index);
    setLightbox(true);
  }

  // ADR-039：图片数为 0 时整块不渲染（无空框 / 占位 /「暂无图片」文案）
  return (
    <div>
      {images.length > 0 ? (
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
          ) : null}
          <span className="tag tag-neutral" style={{ position: "relative", zIndex: 1 }}>
            {active + 1} / {images.length}
          </span>
        </button>
      ) : null}

      <main className="public-phone">
        {intro}
        {images.length > 0 ? (
          <section className="detail-block">
            <h2 className="detail-section">车辆图片</h2>
            <div className="photo-grid">
              {images.slice(0, 6).map((img, i) => {
                const overflow = i === 5 && extra > 0;
                return (
                  <figure key={img.id} className="photo-tile">
                    <button
                      type="button"
                      className={i === active ? "photo-cell photo-cell-on" : "photo-cell"}
                      onClick={() => openAt(i)}
                    >
                      {overflow ? (
                        <span>+{extra}</span>
                      ) : (
                        <SmartImage src={img.url} alt={img.caption || `${title} ${i + 1}`} sizes="33vw" />
                      )}
                    </button>
                    {!overflow && img.caption ? <figcaption className="photo-caption">{img.caption}</figcaption> : null}
                  </figure>
                );
              })}
            </div>
          </section>
        ) : null}
        {footer}
      </main>

      {lightbox && current ? (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label="车辆图片" onClick={() => setLightbox(false)}>
          <img src={current.url} alt={current.caption || title} onClick={(e) => e.stopPropagation()} />
          {current.caption ? <p className="lightbox-caption">{current.caption}</p> : null}
          <div className="lightbox-nav">
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
