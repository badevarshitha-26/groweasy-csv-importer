"use client";

import { formatContact, formatDate } from "@/lib/csv";
import type { CrmLead, SkippedRecord } from "@/types/crm";

const STATUS_STYLES: Record<string, string> = {
  SALE_DONE: "bg-blue-100 text-blue-800",
  GOOD_LEAD_FOLLOW_UP: "bg-emerald-100 text-emerald-800",
  DID_NOT_CONNECT: "bg-gray-100 text-gray-700",
  BAD_LEAD: "bg-rose-100 text-rose-800",
};

interface Props {
  imported: CrmLead[];
  skipped: SkippedRecord[];
  totalImported: number;
  totalSkipped: number;
  onImportAnother: () => void;
}

export function ResultsView({
  imported,
  skipped,
  totalImported,
  totalSkipped,
  onImportAnother,
}: Props) {
  return (
    <div className="animate-fade-up space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Total Imported" value={totalImported} tone="success" />
        <StatCard label="Total Skipped" value={totalSkipped} tone="warn" />
        <StatCard
          label="Processed"
          value={totalImported + totalSkipped}
          tone="neutral"
        />
      </div>

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-gray-900">
              Successfully Parsed Records
            </h2>
            <p className="text-sm text-gray-500">
              AI-mapped GrowEasy CRM fields from your CSV
            </p>
          </div>
          <button
            type="button"
            onClick={onImportAnother}
            className="rounded-lg bg-brand-orange px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-orangeHover"
          >
            Import Another CSV
          </button>
        </div>

        <div className="table-scroll max-h-[420px] overflow-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead>
              <tr>
                {[
                  "Lead Name",
                  "Email",
                  "Contact",
                  "Date Created",
                  "Company",
                  "Status",
                  "City",
                  "Source",
                  "Notes",
                ].map((h) => (
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
              {imported.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-gray-500">
                    No records imported.
                  </td>
                </tr>
              ) : (
                imported.map((lead, i) => (
                  <tr key={i} className="odd:bg-white even:bg-gray-50/60">
                    <td className="whitespace-nowrap px-3 py-2.5 font-medium text-gray-900">
                      {lead.name || "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-gray-700">
                      {lead.email || "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-gray-700">
                      {formatContact(lead)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-gray-600">
                      {formatDate(lead.created_at)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-gray-700">
                      {lead.company || "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      {lead.crm_status ? (
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            STATUS_STYLES[lead.crm_status] || "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {lead.crm_status.replace(/_/g, " ")}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-gray-700">
                      {lead.city || "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-gray-600">
                      {lead.data_source || "—"}
                    </td>
                    <td className="max-w-[240px] truncate px-3 py-2.5 text-gray-600">
                      {lead.crm_note || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {skipped.length > 0 && (
        <section>
          <h2 className="mb-1 font-display text-lg font-semibold text-gray-900">
            Skipped Records
          </h2>
          <p className="mb-3 text-sm text-gray-500">
            Rows without email or mobile, or that failed AI mapping
          </p>
          <div className="table-scroll max-h-[240px] overflow-auto rounded-xl border border-rose-100 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="sticky-th border-b px-3 py-2 text-xs font-semibold uppercase text-gray-500">
                    Row
                  </th>
                  <th className="sticky-th border-b px-3 py-2 text-xs font-semibold uppercase text-gray-500">
                    Reason
                  </th>
                  <th className="sticky-th border-b px-3 py-2 text-xs font-semibold uppercase text-gray-500">
                    Raw Preview
                  </th>
                </tr>
              </thead>
              <tbody>
                {skipped.map((s) => (
                  <tr key={s.rowIndex} className="odd:bg-white even:bg-rose-50/40">
                    <td className="whitespace-nowrap px-3 py-2 text-gray-600">
                      {s.rowIndex + 1}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-rose-700">{s.reason}</td>
                    <td className="max-w-md truncate px-3 py-2 text-gray-500">
                      {Object.values(s.raw).filter(Boolean).slice(0, 4).join(" · ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "success" | "warn" | "neutral";
}) {
  const tones = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    warn: "border-amber-200 bg-amber-50 text-amber-800",
    neutral: "border-gray-200 bg-white text-gray-800",
  };
  return (
    <div className={`rounded-xl border px-4 py-3 ${tones[tone]}`}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold">{value}</p>
    </div>
  );
}
