export interface CrmLead {
  created_at: string | null;
  name: string | null;
  email: string | null;
  country_code: string | null;
  mobile_without_country_code: string | null;
  company: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  lead_owner: string | null;
  crm_status: string | null;
  crm_note: string | null;
  data_source: string | null;
  possession_time: string | null;
  description: string | null;
}

export interface SkippedRecord {
  rowIndex: number;
  reason: string;
  raw: Record<string, string>;
}

export interface ImportResult {
  success: boolean;
  jobId?: string;
  imported: CrmLead[];
  skipped: SkippedRecord[];
  totalImported: number;
  totalSkipped: number;
  batchesProcessed?: number;
  batchesFailed?: number;
  error?: string;
}

export type CsvRow = Record<string, string>;

export type ImportStep = "upload" | "preview" | "processing" | "results";

export interface ParsedFile {
  fileName: string;
  fileSize: number;
  headers: string[];
  rows: CsvRow[];
  totalRows: number;
}
