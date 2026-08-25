"use client";

import { ReactNode } from "react";

export function Field({
  label,
  suffix,
  value,
  onChange,
  step = 1,
  min,
  help,
}: {
  label: string;
  suffix?: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  help?: string;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-wide text-ink/50 mb-1">{label}</span>
      <div className="flex items-center border border-line bg-white rounded-md focus-within:border-moss-500 transition-colors">
        <input
          type="number"
          className="num w-full bg-transparent px-3 py-2 text-sm outline-none"
          value={Number.isFinite(value) ? value : 0}
          step={step}
          min={min}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        />
        {suffix && <span className="pr-3 text-xs text-ink/40 num">{suffix}</span>}
      </div>
      {help && <span className="block text-[11px] text-ink/40 mt-1">{help}</span>}
    </label>
  );
}

export function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-wide text-ink/50 mb-1">{label}</span>
      <select
        className="w-full border border-line bg-white rounded-md px-3 py-2 text-sm outline-none focus:border-moss-500"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function SectionCard({ title, eyebrow, children }: { title: string; eyebrow?: string; children: ReactNode }) {
  return (
    <div className="bg-white border border-line rounded-lg p-5">
      {eyebrow && <div className="text-[11px] uppercase tracking-wide text-moss-600 font-medium mb-1">{eyebrow}</div>}
      <h3 className="font-display text-lg mb-4">{title}</h3>
      {children}
    </div>
  );
}
