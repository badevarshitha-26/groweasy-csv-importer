"use client";

import { formatBytes } from "@/lib/csv";
import type { ParsedFile } from "@/types/crm";

interface Props {
  parsed: ParsedFile;
  onRemove: () => void;
  onCancel: () => void;
  onConfirm: () => void;
  confirming?: boolean;
}

export function PreviewTable({
  parsed,
  onRemove,
  onCancel,
  onConfirm,
  confirming,
}: Props) {
  const previewRows = parsed.rows.slice(0, 100);

  return (
    <div className="animate-fade-up">
      <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-xs font-bold text-brand-teal ring-1 ring-gray-200">
            CSV
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-gray-900">{parsed.fileName}</p>
            <p className="text-xs text-gray-500">
              {formatBytes(parsed.fileSize)} · {parsed.totalRows} rows · {parsed.headers.length}{" "}
              columns
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="rounded-md p-1.5 text-gray-400 hover:bg-white hover:text-gray-700"
          aria-label="Remove file"
        >
          ✕
        </button>
      </div>

      <div className="table-scroll max-h-[340px] overflow-auto rounded-xl border border-gray-200">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead>
            <tr>
              <th className="sticky-th whitespace-nowrap border-b border-gray-200 px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                #
              </th>
              {parsed.headers.map((h) => (
                <th
                  key={h}
                  className="sticky-th whitespace-nowrap border-b border-gray-200 px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {previewRows.map((row, i) => (
              <tr key={i} className="odd:bg-white even:bg-gray-50/70 hover:bg-orange-50/40">
                <td className="whitespace-nowrap px-3 py-2 text-xs text-gray-400">{i + 1}</td>
                {parsed.headers.map((h) => (
                  <td key={h} className="max-w-[220px] truncate whitespace-nowrap px-3 py-2 text-gray-700">
                    {row[h] || "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {parsed.totalRows > 100 && (
        <p className="mt-2 text-xs text-gray-500">
          Showing first 100 of {parsed.totalRows} rows in preview. All rows will be sent on confirm.
        </p>
      )}

      <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={confirming}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={confirming}
          className="rounded-lg bg-brand-orange px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-orangeHover disabled:opacity-60"
        >
          {confirming ? "Importing…" : "Confirm Import"}
        </button>
      </div>
    </div>
  );
}
