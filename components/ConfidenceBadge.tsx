import { Confidence } from "@/lib/types";
import clsx from "clsx";

const CONFIG: Record<Confidence, { label: string; dot: string; text: string }> = {
  high: { label: "High confidence", dot: "bg-moss-500", text: "text-moss-600" },
  medium: { label: "Medium confidence", dot: "bg-gold-400", text: "text-[#8A6B1F]" },
  low: { label: "Low confidence", dot: "bg-rust-500", text: "text-rust-500" },
};

export function ConfidenceBadge({ confidence, source }: { confidence: Confidence; source?: string }) {
  const cfg = CONFIG[confidence];
  return (
    <span className={clsx("inline-flex items-center gap-1.5 text-[11px] font-medium", cfg.text)} title={source}>
      <span className={clsx("h-1.5 w-1.5 rounded-full", cfg.dot)} />
      {cfg.label}
    </span>
  );
}
