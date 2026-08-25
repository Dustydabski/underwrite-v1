"use client";

import { UnitMixRow } from "@/lib/types";
import { fmtCurrency } from "@/lib/format";

function newRow(): UnitMixRow {
  return { id: `unit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, label: "Unit", count: 1, monthlyRent: 0 };
}

export function UnitMixEditor({
  rows,
  onChange,
}: {
  rows: UnitMixRow[];
  onChange: (rows: UnitMixRow[]) => void;
}) {
  const total = rows.reduce((sum, r) => sum + r.count * r.monthlyRent, 0);

  function updateRow(id: string, patch: Partial<UnitMixRow>) {
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function removeRow(id: string) {
    onChange(rows.filter((r) => r.id !== id));
  }

  return (
    <div>
      <span className="block text-[11px] uppercase tracking-wide text-ink/50 mb-1">Rent roll</span>
      <div className="border border-line rounded-md divide-y divide-line">
        <div className="grid grid-cols-[1fr_70px_110px_28px] gap-2 px-3 py-2 text-[11px] uppercase tracking-wide text-ink/40">
          <span>Unit type</span>
          <span># of units</span>
          <span>Rent / unit</span>
          <span />
        </div>
        {rows.map((row) => (
          <div key={row.id} className="grid grid-cols-[1fr_70px_110px_28px] gap-2 px-3 py-2 items-center">
            <input
              type="text"
              value={row.label}
              onChange={(e) => updateRow(row.id, { label: e.target.value })}
              className="border border-line bg-white rounded-md px-2 py-1.5 text-sm outline-none focus:border-moss-500"
            />
            <input
              type="number"
              min={1}
              value={row.count}
              onChange={(e) => updateRow(row.id, { count: parseInt(e.target.value, 10) || 1 })}
              className="num border border-line bg-white rounded-md px-2 py-1.5 text-sm outline-none focus:border-moss-500"
            />
            <input
              type="number"
              step={25}
              value={row.monthlyRent}
              onChange={(e) => updateRow(row.id, { monthlyRent: parseFloat(e.target.value) || 0 })}
              className="num border border-line bg-white rounded-md px-2 py-1.5 text-sm outline-none focus:border-moss-500"
            />
            <button
              type="button"
              onClick={() => removeRow(row.id)}
              disabled={rows.length === 1}
              className="text-ink/40 hover:text-rust-500 disabled:opacity-20 disabled:hover:text-ink/40 text-sm"
              aria-label={`Remove ${row.label}`}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mt-2">
        <button
          type="button"
          onClick={() => onChange([...rows, newRow()])}
          className="text-xs text-moss-600 hover:text-moss-700 underline"
        >
          + Add unit type
        </button>
        <span className="text-sm">
          <span className="text-ink/50 mr-2">Scheduled gross rent</span>
          <span className="num font-semibold">{fmtCurrency(total)}/mo</span>
        </span>
      </div>
    </div>
  );
}
