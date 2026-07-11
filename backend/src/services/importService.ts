import type { CsvRow, ImportResult, SkippedRecord, CrmLead } from "../types/crm";
import { chunkRows } from "../utils/csvParser";
import { hasContactInfo } from "../utils/normalize";
import { AiExtractor, withRetry, type AiBatchItem } from "./aiExtractor";
import { hasGeminiKey, heuristicExtractBatch } from "./heuristicMapper";

export interface ImportProgress {
  status: "processing" | "completed" | "failed";
  totalRows: number;
  processedRows: number;
  currentBatch: number;
  totalBatches: number;
  message: string;
  result?: ImportResult;
  error?: string;
}

const jobs = new Map<string, ImportProgress>();

export function getJob(id: string): ImportProgress | undefined {
  return jobs.get(id);
}

export function createJobId(): string {
  return `job_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function jobsSeed(jobId: string, totalRows: number): void {
  jobs.set(jobId, {
    status: "processing",
    totalRows,
    processedRows: 0,
    currentBatch: 0,
    totalBatches: 0,
    message: "Queued for extraction…",
  });
}

export function markJobFailed(jobId: string, error: string): void {
  const existing = jobs.get(jobId);
  jobs.set(jobId, {
    status: "failed",
    totalRows: existing?.totalRows ?? 0,
    processedRows: existing?.processedRows ?? 0,
    currentBatch: existing?.currentBatch ?? 0,
    totalBatches: existing?.totalBatches ?? 0,
    message: "Import failed",
    error,
  });
}

export async function processImport(options: {
  jobId: string;
  rows: CsvRow[];
  apiKey: string;
  model: string;
  batchSize: number;
  maxRetries: number;
}): Promise<ImportResult> {
  const { jobId, rows, apiKey, model, batchSize, maxRetries } = options;
  const useAi = hasGeminiKey(apiKey);
  const batches = chunkRows(
    rows.map((data, i) => ({ rowIndex: i, data })),
    batchSize
  );

  jobs.set(jobId, {
    status: "processing",
    totalRows: rows.length,
    processedRows: 0,
    currentBatch: 0,
    totalBatches: batches.length,
    message: useAi
      ? "Starting AI extraction..."
      : "No Gemini key — using offline smart mapper (demo mode)…",
  });

  let extractor: AiExtractor | null = null;
  if (useAi) {
    try {
      extractor = new AiExtractor(apiKey, model);
    } catch (err) {
      console.warn("[import] AI init failed, falling back to heuristic", err);
      extractor = null;
    }
  } else {
    console.warn(
      "[import] GEMINI_API_KEY missing — demo mode (heuristic mapper)"
    );
  }

  const imported: CrmLead[] = [];
  const skipped: SkippedRecord[] = [];
  let batchesFailed = 0;

  for (let b = 0; b < batches.length; b++) {
    const batch = batches[b];
    jobs.set(jobId, {
      status: "processing",
      totalRows: rows.length,
      processedRows: imported.length + skipped.length,
      currentBatch: b + 1,
      totalBatches: batches.length,
      message: extractor
        ? `AI processing batch ${b + 1} of ${batches.length}...`
        : `Demo mapper batch ${b + 1} of ${batches.length}...`,
    });

    try {
      let results: AiBatchItem[];
      if (extractor) {
        results = await withRetry(
          () => extractor!.extractBatch(batch),
          maxRetries
        );
      } else {
        await new Promise((r) => setTimeout(r, 250));
        results = heuristicExtractBatch(batch);
      }

      for (const item of results) {
        const raw = rows[item.rowIndex] ?? {};
        if (item.skip || !item.lead) {
          skipped.push({
            rowIndex: item.rowIndex,
            reason: item.skipReason || "Skipped",
            raw,
          });
          continue;
        }

        if (!hasContactInfo(item.lead)) {
          skipped.push({
            rowIndex: item.rowIndex,
            reason: "Missing email and mobile",
            raw,
          });
          continue;
        }

        imported.push(item.lead);
      }
    } catch (err) {
      try {
        const results = heuristicExtractBatch(batch);
        for (const item of results) {
          const raw = rows[item.rowIndex] ?? {};
          if (item.skip || !item.lead || !hasContactInfo(item.lead)) {
            skipped.push({
              rowIndex: item.rowIndex,
              reason: item.skipReason || "Missing email and mobile",
              raw,
            });
            continue;
          }
          imported.push(item.lead);
        }
      } catch {
        batchesFailed += 1;
        const reason =
          err instanceof Error ? err.message : "AI batch failed after retries";
        for (const { rowIndex, data } of batch) {
          skipped.push({
            rowIndex,
            reason: `Batch failed: ${reason}`,
            raw: data,
          });
        }
      }
    }

    jobs.set(jobId, {
      status: "processing",
      totalRows: rows.length,
      processedRows: imported.length + skipped.length,
      currentBatch: b + 1,
      totalBatches: batches.length,
      message: `Finished batch ${b + 1} of ${batches.length}`,
    });
  }

  const result: ImportResult = {
    imported,
    skipped,
    totalImported: imported.length,
    totalSkipped: skipped.length,
    batchesProcessed: batches.length,
    batchesFailed,
  };

  jobs.set(jobId, {
    status: "completed",
    totalRows: rows.length,
    processedRows: rows.length,
    currentBatch: batches.length,
    totalBatches: batches.length,
    message: extractor
      ? "Import complete (AI)"
      : "Import complete (demo mapper — add GEMINI_API_KEY for real AI)",
    result,
  });

  setTimeout(() => jobs.delete(jobId), 30 * 60 * 1000).unref?.();

  return result;
}

export async function runImportSync(options: {
  rows: CsvRow[];
  apiKey: string;
  model: string;
  batchSize: number;
  maxRetries: number;
}): Promise<{ jobId: string; result: ImportResult }> {
  const jobId = createJobId();
  const result = await processImport({ ...options, jobId });
  return { jobId, result };
}
