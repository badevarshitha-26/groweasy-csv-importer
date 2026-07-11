"use client";

import { useCallback, useRef, useState } from "react";
import { parseCsvFile, validateCsvFile } from "@/lib/csv";
import type { ParsedFile } from "@/types/crm";

interface Props {
  onParsed: (parsed: ParsedFile) => void;
  onCancel: () => void;
}

export function UploadDropzone({ onParsed, onCancel }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFile = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      setError(null);
      const validationError = validateCsvFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      setLoading(true);
      try {
        const parsed = await parseCsvFile(file);
        if (parsed.totalRows === 0) {
          setError("CSV has headers but no data rows.");
          return;
        }
        onParsed(parsed);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to parse CSV");
      } finally {
        setLoading(false);
      }
    },
    [onParsed]
  );

  return (
    <div className="animate-fade-up">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void handleFile(e.dataTransfer.files?.[0]);
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-14 transition ${
          dragging
            ? "border-brand-teal bg-teal-50/60"
            : "border-gray-300 bg-gray-50 hover:border-brand-orange hover:bg-orange-50/40"
        }`}
      >
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-gray-200">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="text-gray-500"
          >
            <path d="M12 16V4M12 4l-4 4M12 4l4 4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 14v4a2 2 0 002 2h12a2 2 0 002-2v-4" strokeLinecap="round" />
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-800">
          {loading ? "Parsing CSV…" : "Drop your CSV file here or click to browse files."}
        </p>
        <p className="mt-1 text-xs text-gray-500">Supported file: .csv (max 5MB)</p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => void handleFile(e.target.files?.[0])}
        />
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="inline-flex items-center rounded-md bg-gray-100 px-2.5 py-1 text-xs text-gray-600">
          Supported file: .csv (max 5MB)
        </span>
        <a
          href="/sample_crm_leads.csv"
          download
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-teal hover:underline"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <path d="M14 2v6h6M12 18v-6M9 15l3 3 3-3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Download Sample CSV Template
        </a>
      </div>

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100">
          {error}
        </p>
      )}

      <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled
          className="rounded-lg bg-brand-orange/50 px-4 py-2 text-sm font-medium text-white cursor-not-allowed"
          title="Select a file first"
        >
          Upload File
        </button>
      </div>

      <p className="mt-2 text-center text-[11px] text-gray-400">
        Tip: try <code className="text-gray-500">messy_facebook_export.csv</code> — different
        column names, AI still maps them.
      </p>
    </div>
  );
}
