type Props = {
  children: string;
  tone?: "accent" | "accent-2" | "neutral" | "outline";
  onRemove?: () => void;
};

const CLASS_NAME = {
  accent: "tag tag-accent",
  "accent-2": "tag tag-accent-2",
  neutral: "tag tag-neutral",
  outline: "tag tag-outline",
} as const;

export function Tag({ children, tone = "outline", onRemove }: Props) {
  if (!onRemove) return <span className={CLASS_NAME[tone]}>{children}</span>;
  return (
    <button type="button" className={CLASS_NAME[tone]} onClick={onRemove}>
      {children} ✕
    </button>
  );
}
