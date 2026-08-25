import clsx from "clsx";
import { Recommendation } from "@/lib/types";

const CONFIG: Record<Recommendation, { label: string; color: string; ring: string }> = {
  BUY: { label: "BUY", color: "text-moss-600", ring: "border-moss-600" },
  CONSIDER: { label: "CONSIDER", color: "text-gold-400", ring: "border-[#8A6B1F]" },
  PASS: { label: "PASS", color: "text-rust-500", ring: "border-rust-500" },
};

export function ScoreStamp({ recommendation, score }: { recommendation: Recommendation; score: number }) {
  const cfg = CONFIG[recommendation];
  return (
    <div className={clsx("stamp inline-flex flex-col items-center justify-center px-8 py-4", cfg.color, cfg.ring)}>
      <span className="font-display text-3xl sm:text-4xl font-semibold tracking-wide">{cfg.label}</span>
      <span className="num text-xs mt-1 opacity-80">{score.toFixed(0)} / 100</span>
    </div>
  );
}
