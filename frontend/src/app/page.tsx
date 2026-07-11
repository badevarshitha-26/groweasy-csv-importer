"use client";

import { useCallback, useEffect, useState } from "react";
import { Sidebar, type AppPage } from "@/components/Sidebar";
import { Modal } from "@/components/Modal";
import { UploadDropzone } from "@/components/UploadDropzone";
import { PreviewTable } from "@/components/PreviewTable";
import { ProcessingState } from "@/components/ProcessingState";
import { ResultsView } from "@/components/ResultsView";
import { ManageLeadsView } from "@/components/ManageLeadsView";
import {
  confirmImport,
  fetchResults,
  pollProgress,
  startAsyncImport,
} from "@/lib/csv";
import {
  loadLeads,
  saveImportedLeads,
  saveLastImport,
} from "@/lib/leadsStore";
import type { CrmLead, ImportResult, ImportStep, ParsedFile } from "@/types/crm";

const SOURCE_CARDS = [
  { name: "Google Ads", desc: "Import leads from Google Ads exports" },
  { name: "Facebook Ads", desc: "Import Meta / Facebook lead forms" },
  { name: "CSV Upload", desc: "Any spreadsheet — AI maps the columns", highlight: true },
];

export default function HomePage() {
  const [page, setPage] = useState<AppPage>("lead-sources");
  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [step, setStep] = useState<ImportStep>("upload");
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState("");
  const [batchLabel, setBatchLabel] = useState("");

  useEffect(() => {
    setLeads(loadLeads());
  }, []);

  const refreshLeads = useCallback(() => {
    setLeads(loadLeads());
  }, []);

  const applyImportResult = useCallback((data: ImportResult) => {
    setResult(data);
    saveLastImport(data);
    if (data.imported?.length) {
      const merged = saveImportedLeads(data.imported);
      setLeads(merged);
    }
    setProgress(100);
    setStep("results");
    setModalOpen(false);
    setPage("manage-leads");
  }, []);

  const resetImport = useCallback(() => {
    setStep("upload");
    setParsed(null);
    setError(null);
    setProgress(0);
    setProgressMsg("");
    setBatchLabel("");
  }, []);

  const openModal = () => {
    resetImport();
    setModalOpen(true);
  };

  const closeModal = () => {
    if (step === "processing") return;
    setModalOpen(false);
  };

  const handleParsed = (file: ParsedFile) => {
    setParsed(file);
    setStep("preview");
  };

  const handleConfirm = async () => {
    if (!parsed) return;
    setError(null);
    setStep("processing");
    setProgress(5);
    setProgressMsg("Sending rows to AI extractor…");

    try {
      try {
        const { jobId } = await startAsyncImport(parsed.rows);
        setProgressMsg("AI batches running…");

        for (;;) {
          await new Promise((r) => setTimeout(r, 700));
          const p = await pollProgress(jobId);
          if (!p.success) throw new Error(p.error || "Progress check failed");

          const pct =
            p.totalBatches > 0
              ? Math.round((p.currentBatch / p.totalBatches) * 100)
              : 10;
          setProgress(Math.min(95, Math.max(8, pct)));
          setProgressMsg(p.message || "Processing…");
          setBatchLabel(
            p.totalBatches ? `Batch ${p.currentBatch} / ${p.totalBatches}` : ""
          );

          if (p.status === "completed") {
            const data = await fetchResults(jobId);
            if (!data.success) throw new Error(data.error || "Failed to load results");
            applyImportResult(data as ImportResult);
            return;
          }
          if (p.status === "failed") {
            throw new Error(
              p.error ||
                "Import failed. Check that GEMINI_API_KEY is set in backend/.env"
            );
          }
        }
      } catch {
        setProgressMsg("Running synchronous AI import…");
        setProgress(40);
        const data = await confirmImport(parsed.rows);
        applyImportResult(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
      setStep("preview");
    }
  };

  return (
    <div className="app-shell flex h-screen overflow-hidden">
      <Sidebar activePage={page} onNavigate={setPage} />

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {page === "manage-leads" ? (
          <div className="flex-1 overflow-y-auto p-6">
            <ManageLeadsView
              leads={leads}
              onImportCsv={() => {
                setPage("lead-sources");
                openModal();
              }}
              onRefresh={refreshLeads}
            />
          </div>
        ) : (
          <>
            <header className="flex items-center justify-between border-b border-gray-200/80 bg-white/70 px-6 py-4 backdrop-blur">
              <div>
                <h1 className="font-display text-2xl font-semibold tracking-tight text-gray-900">
                  Lead Sources
                </h1>
                <p className="mt-0.5 text-sm text-gray-500">
                  Connect channels or import any CSV — AI maps fields to GrowEasy CRM
                </p>
              </div>
              <button
                type="button"
                onClick={openModal}
                className="rounded-lg bg-brand-orange px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-orangeHover"
              >
                Import Leads via CSV
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-6">
              {step === "results" && result ? (
                <ResultsView
                  imported={result.imported}
                  skipped={result.skipped}
                  totalImported={result.totalImported}
                  totalSkipped={result.totalSkipped}
                  onImportAnother={openModal}
                />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {SOURCE_CARDS.map((card) => (
                    <button
                      key={card.name}
                      type="button"
                      onClick={card.highlight ? openModal : undefined}
                      className={`rounded-2xl border bg-white p-5 text-left shadow-sm transition ${
                        card.highlight
                          ? "border-brand-orange/40 ring-1 ring-brand-orange/20 hover:shadow-md"
                          : "border-gray-200 opacity-80"
                      }`}
                    >
                      <div
                        className={`mb-3 inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold ${
                          card.highlight
                            ? "bg-orange-50 text-brand-orange"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {card.highlight ? "AI Ready" : "Channel"}
                      </div>
                      <h3 className="font-display text-base font-semibold text-gray-900">
                        {card.name}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">{card.desc}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        wide={step === "preview" || step === "processing"}
        subtitle={
          step === "processing"
            ? "Please wait while AI extracts CRM fields. Do not close this window."
            : "Upload a CSV file to bulk import leads into your system."
        }
      >
        {step === "upload" && (
          <UploadDropzone onParsed={handleParsed} onCancel={closeModal} />
        )}
        {step === "preview" && parsed && (
          <>
            {error && (
              <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}
            <PreviewTable
              parsed={parsed}
              onRemove={resetImport}
              onCancel={closeModal}
              onConfirm={() => void handleConfirm()}
            />
          </>
        )}
        {step === "processing" && (
          <ProcessingState
            message={progressMsg}
            progress={progress}
            batchLabel={batchLabel}
          />
        )}
      </Modal>
    </div>
  );
}
