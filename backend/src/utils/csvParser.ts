import Papa from "papaparse";
import type { CsvRow } from "../types/crm";

export interface ParsedCsv {
  headers: string[];
  rows: CsvRow[];
  totalRows: number;
}

/**
 * Parse CSV text into normalized row objects.
 * Empty trailing rows are dropped. Keys are trimmed header names.
 */
export function parseCsvText(csvText: string): ParsedCsv {
  const result = Papa.parse<Record<string, unknown>>(csvText, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header) => header.trim(),
  });

  if (result.errors.length > 0) {
    const fatal = result.errors.find((e) => e.type === "Delimiter" || e.type === "Quotes");
    if (fatal) {
      throw new Error(`Invalid CSV: ${fatal.message}`);
    }
  }

  const headers = (result.meta.fields ?? []).filter(Boolean);

  if (headers.length === 0) {
    throw new Error("CSV has no headers. Please upload a valid CSV file.");
  }

  const rows: CsvRow[] = result.data
    .map((row) => {
      const normalized: CsvRow = {};
      for (const key of headers) {
        const value = row[key];
        normalized[key] =
          value === null || value === undefined ? "" : String(value).trim();
      }
      return normalized;
    })
    .filter((row) => Object.values(row).some((v) => v.length > 0));

  return {
    headers,
    rows,
    totalRows: rows.length,
  };
}

export function chunkRows<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items];
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}
