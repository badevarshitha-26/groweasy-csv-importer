import Papa from "papaparse";
import type { CsvRow, ParsedFile } from "@/types/crm";

const MAX_BYTES = 5 * 1024 * 1024;

export function validateCsvFile(file: File): string | null {
  if (!file.name.toLowerCase().endsWith(".csv")) {
    return "Only .csv files are supported.";
  }
  if (file.size > MAX_BYTES) {
    return "File must be 5MB or smaller.";
  }
  if (file.size === 0) {
    return "File is empty.";
  }
  return null;
}

export function parseCsvFile(file: File): Promise<ParsedFile> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (h) => h.trim(),
      complete: (result) => {
        if (result.errors.some((e) => e.type === "Delimiter")) {
          reject(new Error(result.errors[0].message));
          return;
        }
        const headers = (result.meta.fields ?? []).filter(Boolean);
        if (!headers.length) {
          reject(new Error("CSV has no headers."));
          return;
        }
        const rows: CsvRow[] = result.data
          .map((row) => {
            const out: CsvRow = {};
            for (const key of headers) {
              const v = row[key];
              out[key] = v == null ? "" : String(v).trim();
            }
            return out;
          })
          .filter((row) => Object.values(row).some((v) => v.length > 0));

        resolve({
          fileName: file.name,
          fileSize: file.size,
          headers,
          rows,
          totalRows: rows.length,
        });
      },
      error: (err) => reject(err),
    });
  });
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function formatContact(lead: {
  country_code: string | null;
  mobile_without_country_code: string | null;
}): string {
  if (!lead.mobile_without_country_code) return "—";
  return `${lead.country_code ?? ""}${lead.mobile_without_country_code}`;
}

export function formatDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export async function confirmImport(rows: CsvRow[]): Promise<import("@/types/crm").ImportResult> {
  const res = await fetch(`${API_URL}/api/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rows }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Import failed");
  }
  return data;
}

export async function startAsyncImport(rows: CsvRow[]): Promise<{ jobId: string }> {
  const res = await fetch(`${API_URL}/api/import/async`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rows }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Failed to start import");
  }
  return { jobId: data.jobId };
}

export async function pollProgress(jobId: string) {
  const res = await fetch(`${API_URL}/api/import/${jobId}/progress`);
  return res.json();
}

export async function fetchResults(jobId: string) {
  const res = await fetch(`${API_URL}/api/import/${jobId}/results`);
  return res.json();
}

export { API_URL };
