"use client";

import { useState } from "react";
import { inputClass } from "@/components/form";

export type QuotationLineDraft = {
  section: string;
  description: string;
  unit: string;
  quantity: number;
  unit_rate: number;
};

const emptyLine: QuotationLineDraft = {
  section: "",
  description: "",
  unit: "",
  quantity: 0,
  unit_rate: 0,
};

/** Quotation line-item editor; serialises rows to a hidden items_json input.
 *  Same pattern as the PR items editor, plus a BOQ section column so
 *  conversion maps straight into boq_items. */
export function QuotationItemsField({ initial }: { initial?: QuotationLineDraft[] }) {
  const [items, setItems] = useState<QuotationLineDraft[]>(
    initial?.length ? initial.map((i) => ({ ...emptyLine, ...i })) : [{ ...emptyLine }],
  );

  function update(idx: number, patch: Partial<QuotationLineDraft>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  const total = items.reduce(
    (a, i) => a + (Number(i.quantity) || 0) * (Number(i.unit_rate) || 0),
    0,
  );

  return (
    <div className="space-y-3 sm:space-y-2">
      <input type="hidden" name="items_json" value={JSON.stringify(items)} />
      <div className="hidden sm:grid grid-cols-12 gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <span className="col-span-2">Section</span>
        <span className="col-span-4">Description</span>
        <span>Unit</span>
        <span className="col-span-2">Qty</span>
        <span className="col-span-2">Rate (RM)</span>
        <span />
      </div>
      {items.map((item, idx) => (
        <div
          key={idx}
          className="grid grid-cols-6 sm:grid-cols-12 gap-2 items-center border border-slate-200 sm:border-0 rounded-xl sm:rounded-none p-3 sm:p-0"
        >
          <label className="col-span-3 sm:col-span-2 block">
            <span className="block sm:hidden text-xs font-medium text-slate-500 mb-1">Section</span>
            <input
              className={inputClass}
              value={item.section}
              onChange={(e) => update(idx, { section: e.target.value })}
              placeholder="Structure"
            />
          </label>
          <label className="col-span-6 sm:col-span-4 block sm:order-none -order-1">
            <span className="block sm:hidden text-xs font-medium text-slate-500 mb-1">Description</span>
            <input
              className={inputClass}
              value={item.description}
              onChange={(e) => update(idx, { description: e.target.value })}
              placeholder="Work description"
            />
          </label>
          <label className="col-span-3 sm:col-span-1 block">
            <span className="block sm:hidden text-xs font-medium text-slate-500 mb-1">Unit</span>
            <input
              className={inputClass}
              value={item.unit}
              onChange={(e) => update(idx, { unit: e.target.value })}
              placeholder="m²"
            />
          </label>
          <label className="col-span-3 sm:col-span-2 block">
            <span className="block sm:hidden text-xs font-medium text-slate-500 mb-1">Qty</span>
            <input
              className={inputClass}
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={item.quantity || ""}
              onChange={(e) => update(idx, { quantity: parseFloat(e.target.value) || 0 })}
              placeholder="0"
            />
          </label>
          <label className="col-span-3 sm:col-span-2 block">
            <span className="block sm:hidden text-xs font-medium text-slate-500 mb-1">Rate (RM)</span>
            <input
              className={inputClass}
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={item.unit_rate || ""}
              onChange={(e) => update(idx, { unit_rate: parseFloat(e.target.value) || 0 })}
              placeholder="0.00"
            />
          </label>
          <button
            type="button"
            onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
            disabled={items.length === 1}
            className="col-span-6 sm:col-span-1 min-h-11 sm:min-h-0 rounded-lg border border-slate-200 sm:border-0 text-sm sm:text-lg text-slate-500 hover:text-rose-600 disabled:opacity-30 leading-none"
            aria-label="Remove line"
          >
            <span className="sm:hidden">Remove line</span>
            <span className="hidden sm:inline">×</span>
          </button>
        </div>
      ))}
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={() => setItems((prev) => [...prev, { ...emptyLine }])}
          className="min-h-11 sm:min-h-0 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          + Add line
        </button>
        <span className="text-sm text-slate-500">
          Quotation total:{" "}
          <span className="font-semibold text-slate-900 tabular-nums">
            RM {total.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </span>
      </div>
    </div>
  );
}
