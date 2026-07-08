"use client";

import { useState } from "react";
import { inputClass } from "@/components/form";
import type { PRItem } from "@/lib/types";

const emptyItem: PRItem = { description: "", unit: "", qty: 0, est_rate: 0 };

/** Dynamic line-item editor; serialises rows to a hidden items_json input. */
export function PRItemsField() {
  const [items, setItems] = useState<PRItem[]>([{ ...emptyItem }]);

  function update(idx: number, patch: Partial<PRItem>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  const total = items.reduce((a, i) => a + (Number(i.qty) || 0) * (Number(i.est_rate) || 0), 0);

  return (
    <div className="space-y-2">
      <input type="hidden" name="items_json" value={JSON.stringify(items)} />
      <div className="grid grid-cols-12 gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <span className="col-span-5">Item description</span>
        <span className="col-span-2">Unit</span>
        <span className="col-span-2">Qty</span>
        <span className="col-span-2">Est. rate (RM)</span>
        <span />
      </div>
      {items.map((item, idx) => (
        <div key={idx} className="grid grid-cols-12 gap-2 items-center">
          <input
            className={`${inputClass} col-span-5`}
            value={item.description}
            onChange={(e) => update(idx, { description: e.target.value })}
            placeholder="e.g. Cement OPC 50kg"
          />
          <input
            className={`${inputClass} col-span-2`}
            value={item.unit}
            onChange={(e) => update(idx, { unit: e.target.value })}
            placeholder="bag"
          />
          <input
            className={`${inputClass} col-span-2`}
            type="number"
            min="0"
            step="0.01"
            value={item.qty || ""}
            onChange={(e) => update(idx, { qty: parseFloat(e.target.value) || 0 })}
            placeholder="0"
          />
          <input
            className={`${inputClass} col-span-2`}
            type="number"
            min="0"
            step="0.01"
            value={item.est_rate || ""}
            onChange={(e) => update(idx, { est_rate: parseFloat(e.target.value) || 0 })}
            placeholder="0.00"
          />
          <button
            type="button"
            onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
            disabled={items.length === 1}
            className="text-slate-400 hover:text-rose-600 disabled:opacity-30 text-lg leading-none"
            aria-label="Remove item"
          >
            ×
          </button>
        </div>
      ))}
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={() => setItems((prev) => [...prev, { ...emptyItem }])}
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          + Add item
        </button>
        <span className="text-sm text-slate-500">
          Estimated total:{" "}
          <span className="font-semibold text-slate-900 tabular-nums">
            RM{" "}
            {total.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </span>
      </div>
    </div>
  );
}
