import { useState } from "react";

type Props = {
  src: string | null;
  alt: string;
  priority?: boolean;
  sizes?: string;
  className?: string;
};

export function SmartImage({ src, alt, priority = false, sizes = "100vw", className }: Props) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (!src || src === failedSrc) {
    return (
      <div className={className ?? "vehicle-card-cover"} aria-hidden={alt === ""}>
        {alt || "暂无图片"}
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
