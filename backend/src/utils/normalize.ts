import {
  CRM_STATUSES,
  DATA_SOURCES,
  type CrmLead,
  type CrmStatus,
  type DataSource,
} from "../types/crm";

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_DIGITS_RE = /\d{7,15}/;

export function isValidJsDate(value: string | null | undefined): boolean {
  if (!value || !value.trim()) return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime());
}

export function normalizeCreatedAt(value: string | null | undefined): string | null {
  if (!value || !value.trim()) return null;
  const raw = value.trim();

  // Try native parse first
  if (isValidJsDate(raw)) {
    return new Date(raw).toISOString().replace("T", " ").slice(0, 19);
  }

  // Common DD-MM-YYYY / DD/MM/YYYY formats
  const m = raw.match(
    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
  );
  if (m) {
    const day = Number(m[1]);
    const month = Number(m[2]);
    let year = Number(m[3]);
    if (year < 100) year += 2000;
    const hour = Number(m[4] ?? 0);
    const minute = Number(m[5] ?? 0);
    const second = Number(m[6] ?? 0);
    const d = new Date(year, month - 1, day, hour, minute, second);
    if (!Number.isNaN(d.getTime())) {
      return d.toISOString().replace("T", " ").slice(0, 19);
    }
  }

  return null;
}

export function normalizeStatus(value: string | null | undefined): CrmStatus | null {
  if (!value) return null;
  const cleaned = value.trim().toUpperCase().replace(/[\s-]+/g, "_");

  const aliases: Record<string, CrmStatus> = {
    GOOD_LEAD_FOLLOW_UP: "GOOD_LEAD_FOLLOW_UP",
    GOOD_LEAD: "GOOD_LEAD_FOLLOW_UP",
    FOLLOW_UP: "GOOD_LEAD_FOLLOW_UP",
    DID_NOT_CONNECT: "DID_NOT_CONNECT",
    NOT_CONNECTED: "DID_NOT_CONNECT",
    NO_ANSWER: "DID_NOT_CONNECT",
    NOT_DIALED: "DID_NOT_CONNECT",
    BAD_LEAD: "BAD_LEAD",
    INVALID: "BAD_LEAD",
    SALE_DONE: "SALE_DONE",
    CLOSED: "SALE_DONE",
    WON: "SALE_DONE",
  };

  if (CRM_STATUSES.includes(cleaned as CrmStatus)) {
    return cleaned as CrmStatus;
  }
  return aliases[cleaned] ?? null;
}

export function normalizeDataSource(
  value: string | null | undefined
): DataSource | "" | null {
  if (!value || !value.trim()) return "";
  const cleaned = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if ((DATA_SOURCES as readonly string[]).includes(cleaned)) {
    return cleaned as DataSource;
  }
  return "";
}

export function splitPhone(raw: string | null | undefined): {
  country_code: string | null;
  mobile_without_country_code: string | null;
} {
  if (!raw) return { country_code: null, mobile_without_country_code: null };
  const cleaned = raw.replace(/[^\d+]/g, "");

  // Explicit +91 / 91 handling (most common for this CRM)
  const indiaPlus = cleaned.match(/^\+91(\d{10})$/);
  if (indiaPlus) {
    return { country_code: "+91", mobile_without_country_code: indiaPlus[1] };
  }

  const digitsOnly = cleaned.replace(/\D/g, "");
  if (digitsOnly.length === 12 && digitsOnly.startsWith("91")) {
    return {
      country_code: "+91",
      mobile_without_country_code: digitsOnly.slice(2),
    };
  }
  if (digitsOnly.length === 10) {
    return { country_code: "+91", mobile_without_country_code: digitsOnly };
  }

  if (cleaned.startsWith("+")) {
    // Prefer 1–3 digit country code with remaining 7–12 digit national number
    for (const ccLen of [1, 2, 3]) {
      const cc = cleaned.slice(1, 1 + ccLen);
      const national = cleaned.slice(1 + ccLen);
      if (/^\d+$/.test(cc) && /^\d{7,12}$/.test(national)) {
        // Prefer splits where national looks like a local mobile (10 digits common)
        if (national.length === 10 || ccLen === 2) {
          return {
            country_code: `+${cc}`,
            mobile_without_country_code: national,
          };
        }
      }
    }
    const fallback = cleaned.match(/^\+(\d{1,3})(\d{7,12})$/);
    if (fallback) {
      return {
        country_code: `+${fallback[1]}`,
        mobile_without_country_code: fallback[2],
      };
    }
  }

  if (digitsOnly.length >= 7) {
    return { country_code: null, mobile_without_country_code: digitsOnly };
  }
  return { country_code: null, mobile_without_country_code: null };
}

export function hasContactInfo(lead: Partial<CrmLead>): boolean {
  const email = lead.email?.trim();
  const mobile = lead.mobile_without_country_code?.trim();
  return Boolean((email && EMAIL_RE.test(email)) || (mobile && PHONE_DIGITS_RE.test(mobile)));
}

export function sanitizeLead(raw: Partial<CrmLead>): CrmLead {
  const phone =
    raw.country_code || raw.mobile_without_country_code
      ? {
          country_code: raw.country_code ?? null,
          mobile_without_country_code: raw.mobile_without_country_code ?? null,
        }
      : splitPhone(null);

  // If AI gave a combined mobile in mobile field with country code, re-split
  let country_code = phone.country_code ?? raw.country_code ?? null;
  let mobile = phone.mobile_without_country_code ?? raw.mobile_without_country_code ?? null;

  if (mobile && (mobile.includes("+") || mobile.length > 10)) {
    const split = splitPhone(mobile);
    country_code = country_code || split.country_code;
    mobile = split.mobile_without_country_code || mobile.replace(/\D/g, "");
  }

  if (country_code && !country_code.startsWith("+")) {
    country_code = `+${country_code.replace(/\D/g, "")}`;
  }

  return {
    created_at: normalizeCreatedAt(raw.created_at) ?? (raw.created_at?.trim() || null),
    name: raw.name?.trim() || null,
    email: raw.email?.trim().toLowerCase() || null,
    country_code,
    mobile_without_country_code: mobile?.replace(/\D/g, "") || null,
    company: raw.company?.trim() || null,
    city: raw.city?.trim() || null,
    state: raw.state?.trim() || null,
    country: raw.country?.trim() || null,
    lead_owner: raw.lead_owner?.trim() || null,
    crm_status: normalizeStatus(raw.crm_status),
    crm_note: raw.crm_note?.trim().replace(/\r?\n/g, "\\n") || null,
    data_source: normalizeDataSource(raw.data_source),
    possession_time: raw.possession_time?.trim() || null,
    description: raw.description?.trim().replace(/\r?\n/g, "\\n") || null,
  };
}

export function emptyLead(): CrmLead {
  return {
    created_at: null,
    name: null,
    email: null,
    country_code: null,
    mobile_without_country_code: null,
    company: null,
    city: null,
    state: null,
    country: null,
    lead_owner: null,
    crm_status: null,
    crm_note: null,
    data_source: "",
    possession_time: null,
    description: null,
  };
}
