import { useEffect, useId, useRef, useState, type ReactNode, type TouchEvent } from "react";
import type { ImageItem } from "../types";
import { Button } from "./ui/Button";
import { SmartImage } from "./ui/SmartImage";

type Props = {
  images: ImageItem[];
  title: string;
  intro?: ReactNode;
  footer?: ReactNode;
};

const SWIPE_PX = 40;

export function Gallery({ images, title, intro, footer }: Props) {
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const touchX = useRef<number | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const titleId = useId();
  const current = images[active] ?? null;
  const extra = Math.max(0, images.length - 6);
  const count = images.length;

  function goPrev() {
    if (count === 0) return;
    setActive((i) => (i - 1 + count) % count);
  }
  function goNext() {
    if (count === 0) return;
    setActive((i) => (i + 1) % count);
  }

  // 图片集合变化时夹紧 active
  useEffect(() => {
    if (active >= count) setActive(Math.max(0, count - 1));
  }, [count, active]);

  // 灯箱：键盘 + 焦点
  useEffect(() => {
    if (!lightbox) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtnRef.current?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setLightbox(false);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      } else if (e.key === "Home") {
        e.preventDefault();
        setActive(0);
      } else if (e.key === "End") {
        e.preventDefault();
        setActive(Math.max(0, count - 1));
      } else if (e.key === "Tab" && dialogRef.current) {
        // 简易焦点陷阱：灯箱内循环 Tab
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0]!;
        const last = focusables[focusables.length - 1]!;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [lightbox, count]);

  function onTouchStart(e: TouchEvent) {
    touchX.current = e.changedTouches[0]?.clientX ?? null;
  }
  function onTouchEnd(e: TouchEvent) {
    const start = touchX.current;
    touchX.current = null;
    const end = e.changedTouches[0]?.clientX;
    if (start == null || end == null) return;
    const delta = end - start;
    if (delta > SWIPE_PX) goPrev();
    if (delta < -SWIPE_PX) goNext();
  }

  function openAt(index: number) {
    setActive(index);
    setLightbox(true);
  }

  // ADR-039：图片数为 0 时整块不渲染
  return (
    <div>
      {count > 0 ? (
        <button
          type="button"
          className="public-hero"
          style={{ width: "100%", border: 0, padding: 16 }}
          onClick={() => current && setLightbox(true)}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          aria-label={`${title} 主图，第 ${active + 1} 张，共 ${count} 张，点击放大`}
        >
          {current ? (
            <SmartImage src={current.url} alt={current.caption || title} priority className="public-hero-img" />
          ) : null}
          <span className="tag tag-neutral" style={{ position: "relative", zIndex: 1 }}>
            {active + 1} / {count}
          </span>
        </button>
      ) : null}

      <main className="public-phone">
        {intro}
        {count > 0 ? (
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
                      onClick={() => openAt(overflow ? 5 : i)}
                      aria-label={overflow ? `还有 ${extra} 张，打开图库` : `查看第 ${i + 1} 张`}
                      aria-current={i === active ? "true" : undefined}
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
        <div
          ref={dialogRef}
          className="lightbox"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onClick={() => setLightbox(false)}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <p id={titleId} className="visually-hidden">
            {title} 图片灯箱，第 {active + 1} 张，共 {count} 张。左右键切换，Esc 关闭。
          </p>
          <button
            ref={closeBtnRef}
            type="button"
            className="btn btn-ghost lightbox-close"
            aria-label="关闭灯箱"
            onClick={(e) => {
              e.stopPropagation();
              setLightbox(false);
            }}
          >
            关闭
          </button>
          <img
            src={current.url}
            alt={current.caption || `${title} ${active + 1}`}
            onClick={(e) => e.stopPropagation()}
            draggable={false}
          />
          {current.caption ? <p className="lightbox-caption">{current.caption}</p> : null}
          <div className="lightbox-nav" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" type="button" onClick={goPrev} aria-label="上一张">
              上一张
            </Button>
            <span aria-live="polite">
              {active + 1} / {count}
            </span>
            <Button variant="ghost" type="button" onClick={goNext} aria-label="下一张">
              下一张
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
