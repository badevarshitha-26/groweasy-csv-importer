import type { CrmLead, CsvRow } from "../types/crm";
import type { AiBatchItem } from "./aiExtractor";
import {
  emptyLead,
  hasContactInfo,
  normalizeDataSource,
  normalizeStatus,
  sanitizeLead,
  splitPhone,
} from "../utils/normalize";

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_RE = /(?:\+?\d[\d\s\-()]{6,}\d)/g;

type FieldKey = keyof CrmLead;

const HEADER_ALIASES: Record<FieldKey, string[]> = {
  created_at: [
    "created_at",
    "created",
    "created date",
    "date created",
    "timestamp",
    "lead date",
    "date",
  ],
  name: [
    "name",
    "full name",
    "lead name",
    "contact name",
    "client",
    "customer",
    "person",
  ],
  email: ["email", "email address", "e-mail", "mail", "primary email"],
  country_code: ["country_code", "country code", "dial code", "isd"],
  mobile_without_country_code: [
    "mobile_without_country_code",
    "mobile",
    "phone",
    "phone number",
    "mobile number",
    "whatsapp",
    "contact",
    "contact number",
  ],
  company: ["company", "company name", "organization", "org", "business"],
  city: ["city", "town", "location city"],
  state: ["state", "province", "region"],
  country: ["country", "nation"],
  lead_owner: ["lead_owner", "lead owner", "owner", "assigned to", "agent"],
  crm_status: ["crm_status", "status", "lead status", "stage"],
  crm_note: ["crm_note", "notes", "note", "remarks", "comment", "comments"],
  data_source: ["data_source", "source", "lead source", "channel"],
  possession_time: ["possession_time", "possession", "possession date"],
  description: ["description", "details", "desc", "about"],
};

function normHeader(h: string): string {
  return h.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

function findHeader(headers: string[], aliases: string[]): string | null {
  const normalized = headers.map((h) => ({ raw: h, n: normHeader(h) }));
  for (const alias of aliases) {
    const hit = normalized.find((h) => h.n === alias);
    if (hit) return hit.raw;
  }
  for (const alias of aliases) {
    const hit = normalized.find(
      (h) => h.n.includes(alias) || alias.includes(h.n)
    );
    if (hit) return hit.raw;
  }
  return null;
}

function pick(row: CsvRow, header: string | null): string {
  if (!header) return "";
  return (row[header] || "").trim();
}

function extractEmails(text: string): string[] {
  return Array.from(new Set((text.match(EMAIL_RE) || []).map((e) => e.trim())));
}

function extractPhones(text: string): string[] {
  return Array.from(
    new Set((text.match(PHONE_RE) || []).map((p) => p.trim()).filter(Boolean))
  );
}

/**
 * Offline heuristic mapper used when GEMINI_API_KEY is not configured.
 * Good enough for demos / sample CSVs with common header names.
 */
export function heuristicExtractBatch(
  rows: Array<{ rowIndex: number; data: CsvRow }>
): AiBatchItem[] {
  if (rows.length === 0) return [];

  const headers = Object.keys(rows[0].data);
  const map: Partial<Record<FieldKey, string | null>> = {};
  (Object.keys(HEADER_ALIASES) as FieldKey[]).forEach((field) => {
    map[field] = findHeader(headers, HEADER_ALIASES[field]);
  });

  const usedHeaders = new Set(
    Object.values(map).filter((v): v is string => Boolean(v))
  );

  return rows.map(({ rowIndex, data }) => {
    const noteParts: string[] = [];

    let email = pick(data, map.email ?? null);
    const emailList = extractEmails(email || Object.values(data).join(" "));
    if (emailList.length > 0) {
      email = emailList[0];
      if (emailList.length > 1) {
        noteParts.push(`Extra emails: ${emailList.slice(1).join(", ")}`);
      }
    } else {
      email = "";
    }

    let phoneRaw =
      pick(data, map.mobile_without_country_code ?? null) ||
      pick(data, map.country_code ?? null);
    // Prefer dedicated phone column; else scan all values
    if (!phoneRaw) {
      const phones = extractPhones(Object.values(data).join(" | "));
      phoneRaw = phones[0] || "";
      if (phones.length > 1) {
        noteParts.push(`Extra phones: ${phones.slice(1).join(", ")}`);
      }
    } else {
      const phones = extractPhones(phoneRaw);
      if (phones.length > 1) {
        phoneRaw = phones[0];
        noteParts.push(`Extra phones: ${phones.slice(1).join(", ")}`);
      }
    }

    const split = splitPhone(phoneRaw);
    let country_code =
      pick(data, map.country_code ?? null) || split.country_code || null;
    if (country_code && !country_code.startsWith("+") && /^\d+$/.test(country_code)) {
      country_code = `+${country_code}`;
    }

    const noteFromCol = pick(data, map.crm_note ?? null);
    if (noteFromCol) noteParts.unshift(noteFromCol);

    // Unused columns → notes
    for (const [key, value] of Object.entries(data)) {
      if (!value?.trim()) continue;
      if (usedHeaders.has(key)) continue;
      noteParts.push(`${key}: ${value.trim()}`);
    }

    const partial: Partial<CrmLead> = {
      ...emptyLead(),
      created_at: pick(data, map.created_at ?? null) || null,
      name: pick(data, map.name ?? null) || null,
      email: email || null,
      country_code,
      mobile_without_country_code: split.mobile_without_country_code,
      company: pick(data, map.company ?? null) || null,
      city: pick(data, map.city ?? null) || null,
      state: pick(data, map.state ?? null) || null,
      country: pick(data, map.country ?? null) || null,
      lead_owner: pick(data, map.lead_owner ?? null) || null,
      crm_status: normalizeStatus(pick(data, map.crm_status ?? null)),
      crm_note: noteParts.length ? noteParts.join(" | ") : null,
      data_source: normalizeDataSource(pick(data, map.data_source ?? null)),
      possession_time: pick(data, map.possession_time ?? null) || null,
      description: pick(data, map.description ?? null) || null,
    };

    const lead = sanitizeLead(partial);

    if (!hasContactInfo(lead)) {
      return {
        rowIndex,
        lead: null,
        skip: true,
        skipReason: "Missing email and mobile",
      };
    }

    return {
      rowIndex,
      lead,
      skip: false,
      skipReason: null,
    };
  });
}

export function hasGeminiKey(apiKey: string | undefined): boolean {
  return Boolean(apiKey && apiKey !== "your_gemini_api_key_here" && apiKey.trim().length > 10);
}
