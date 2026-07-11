import { GoogleGenerativeAI } from "@google/generative-ai";
import type { CrmLead, CsvRow } from "../types/crm";
import { CRM_STATUSES, DATA_SOURCES } from "../types/crm";
import { sanitizeLead } from "../utils/normalize";

const SYSTEM_PROMPT = `You are an expert CRM data extraction engine for GrowEasy.

Your job: map messy, arbitrary CSV rows into GrowEasy CRM lead records.
Column names are NEVER fixed. Infer meaning from headers AND cell values.

## Target CRM fields
- created_at: lead creation date/time (must be parseable by JavaScript new Date())
- name: person / lead name
- email: primary email
- country_code: e.g. +91
- mobile_without_country_code: digits only, without country code
- company: company / organization
- city, state, country
- lead_owner: owner email or name
- crm_status: ONLY one of ${CRM_STATUSES.join(" | ")}
- crm_note: remarks, follow-ups, extra emails/phones, comments
- data_source: ONLY one of ${DATA_SOURCES.join(" | ")} — else empty string
- possession_time: property possession time if present
- description: extra description

## Rules
1. Map intelligently: "Full Name"/"Client"/"Contact Name" → name; "E-mail"/"mail" → email; "Phone"/"WhatsApp"/"Mobile" → phone fields.
2. If phone includes country code (+91XXXXXXXXXX), split into country_code and mobile_without_country_code.
3. If multiple emails: use first as email, append rest to crm_note.
4. If multiple mobiles: use first as mobile, append rest to crm_note.
5. Put leftover useful info into crm_note or description.
6. crm_status must be one of the allowed values or null. Map synonyms (e.g. "Sale Done"→SALE_DONE, "Good Lead"→GOOD_LEAD_FOLLOW_UP, "Not Dialed"/"No Answer"→DID_NOT_CONNECT).
7. data_source only if confident match; otherwise "".
8. created_at: prefer ISO-like "YYYY-MM-DD HH:mm:ss". Convert DD-MM-YYYY if needed.
9. Do NOT invent emails or phone numbers. Use null when missing.
10. Keep each field a single line; escape newlines as \\n inside notes.
11. Return ONLY valid JSON — no markdown fences.

## Output JSON shape
{
  "records": [
    {
      "rowIndex": <number matching input rowIndex>,
      "lead": { ...crm fields... },
      "skip": false,
      "skipReason": null
    }
  ]
}

If a row has neither email nor mobile, set skip=true and skipReason="Missing email and mobile".`;

function buildUserPrompt(rows: Array<{ rowIndex: number; data: CsvRow }>): string {
  return `Extract GrowEasy CRM leads from these CSV rows.
Headers may be arbitrary. Use semantic understanding.

INPUT ROWS (JSON):
${JSON.stringify(rows, null, 2)}

Return JSON with one entry per input rowIndex.`;
}

function extractJson(text: string): unknown {
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw new Error("AI returned non-JSON response");
  }
}

export interface AiBatchItem {
  rowIndex: number;
  lead: CrmLead | null;
  skip: boolean;
  skipReason: string | null;
}

export class AiExtractor {
  private model;

  constructor(apiKey: string, modelName = "gemini-2.0-flash") {
    if (!apiKey || apiKey === "your_gemini_api_key_here") {
      throw new Error(
        "GEMINI_API_KEY is missing. Get a free key at https://aistudio.google.com/apikey"
      );
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    this.model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
      },
    });
  }

  async extractBatch(
    rows: Array<{ rowIndex: number; data: CsvRow }>
  ): Promise<AiBatchItem[]> {
    const result = await this.model.generateContent([
      { text: SYSTEM_PROMPT },
      { text: buildUserPrompt(rows) },
    ]);

    const text = result.response.text();
    const parsed = extractJson(text) as {
      records?: Array<{
        rowIndex: number;
        lead?: Partial<CrmLead>;
        skip?: boolean;
        skipReason?: string | null;
      }>;
    };

    const records = parsed.records ?? [];
    const byIndex = new Map(records.map((r) => [r.rowIndex, r]));

    return rows.map(({ rowIndex }) => {
      const item = byIndex.get(rowIndex);
      if (!item) {
        return {
          rowIndex,
          lead: null,
          skip: true,
          skipReason: "AI did not return this row",
        };
      }

      if (item.skip) {
        return {
          rowIndex,
          lead: null,
          skip: true,
          skipReason: item.skipReason || "Skipped by AI",
        };
      }

      const lead = sanitizeLead(item.lead ?? {});
      return {
        rowIndex,
        lead,
        skip: false,
        skipReason: null,
      };
    });
  }
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number,
  delayMs = 800
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
      }
    }
  }
  throw lastError;
}
