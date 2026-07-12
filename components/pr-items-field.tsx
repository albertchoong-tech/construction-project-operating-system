"use client";

import { useState } from "react";
import { inputClass } from "@/components/form";
import type { PRItem } from "@/lib/types";

const emptyItem: PRItem = { description: "", unit: "", qty: 0, est_rate: 0 };

/** Dynamic line-item editor; serialises rows to a hidden items_json input. */
export function PRItemsField({ initial }: { initial?: PRItem[] }) {
  const [items, setItems] = useState<PRItem[]>(
    initial?.length ? initial.map((i) => ({ ...emptyItem, ...i })) : [{ ...emptyItem }],
  );

  function update(idx: number, patch: Partial<PRItem>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  const total = items.reduce((a, i) => a + (Number(i.qty) || 0) * (Number(i.est_rate) || 0), 0);

  return (
    <div className="space-y-3 sm:space-y-2">
      <input type="hidden" name="items_json" value={JSON.stringify(items)} />
      <div className="hidden sm:grid grid-cols-12 gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <span className="col-span-5">Item description</span>
        <span className="col-span-2">Unit</span>
        <span className="col-span-2">Qty</span>
        <span className="col-span-2">Est. rate (RM)</span>
        <span />
      </div>
      {items.map((item, idx) => (
        <div
          key={idx}
          className="grid grid-cols-6 sm:grid-cols-12 gap-2 items-center border border-slate-200 sm:border-0 rounded-xl sm:rounded-none p-3 sm:p-0"
        >
          <label className="col-span-6 sm:col-span-5 block">
            <span className="block sm:hidden text-xs font-medium text-slate-500 mb-1">Item description</span>
            <input
              className={inputClass}
              value={item.description}
              onChange={(e) => update(idx, { description: e.target.value })}
              placeholder="e.g. Cement OPC 50kg"
            />
          </label>
          <label className="col-span-2 block">
            <span className="block sm:hidden text-xs font-medium text-slate-500 mb-1">Unit</span>
            <input
              className={inputClass}
              value={item.unit}
              onChange={(e) => update(idx, { unit: e.target.value })}
              placeholder="bag"
            />
          </label>
          <label className="col-span-2 block">
            <span className="block sm:hidden text-xs font-medium text-slate-500 mb-1">Qty</span>
            <input
              className={inputClass}
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={item.qty || ""}
              onChange={(e) => update(idx, { qty: parseFloat(e.target.value) || 0 })}
              placeholder="0"
            />
          </label>
          <label className="col-span-2 block">
            <span className="block sm:hidden text-xs font-medium text-slate-500 mb-1">Rate (RM)</span>
            <input
              className={inputClass}
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={item.est_rate || ""}
              onChange={(e) => update(idx, { est_rate: parseFloat(e.target.value) || 0 })}
              placeholder="0.00"
            />
          </label>
          <button
            type="button"
            onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
            disabled={items.length === 1}
            className="col-span-6 sm:col-span-1 min-h-11 sm:min-h-0 rounded-lg border border-slate-200 sm:border-0 text-sm sm:text-lg text-slate-500 hover:text-rose-600 disabled:opacity-30 leading-none"
            aria-label="Remove item"
          >
            <span className="sm:hidden">Remove item</span>
            <span className="hidden sm:inline">×</span>
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
