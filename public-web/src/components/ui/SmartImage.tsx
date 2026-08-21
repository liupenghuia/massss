import { useState } from "react";

type Props = {
  src: string | null;
  alt: string;
  priority?: boolean;
  sizes?: string;
  className?: string;
  /** 无图时展示的短字标（默认取 alt 首字） */
  mono?: string;
};

export function SmartImage({ src, alt, priority = false, sizes = "100vw", className, mono }: Props) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (!src || src === failedSrc) {
    const mark = (mono ?? alt).trim().slice(0, 1) || "车";
    return (
      <div
        className={`${className ?? "vehicle-card-cover"} vehicle-card-cover-mono`.trim()}
        role="img"
        aria-label={alt || "暂无图片"}
      >
        {mark}
      </div>
    );
  }
  return (
    <img
      className={className}
      src={src}
      alt={alt}
      width={800}
      height={600}
      sizes={sizes}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      onError={() => setFailedSrc(src)}
    />
  );
}
