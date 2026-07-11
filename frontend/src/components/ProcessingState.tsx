"use client";

interface Props {
  message?: string;
  progress?: number;
  batchLabel?: string;
}

export function ProcessingState({
  message = "AI is mapping your CSV columns to GrowEasy CRM fields…",
  progress,
  batchLabel,
}: Props) {
  return (
    <div className="animate-fade-up flex flex-col items-center py-10 text-center">
      <div className="relative mb-5 h-14 w-14">
        <div className="absolute inset-0 rounded-full border-4 border-orange-100" />
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-brand-orange" />
      </div>
      <h3 className="font-display text-lg font-semibold text-gray-900">
        Processing with AI
      </h3>
      <p className="mt-2 max-w-md text-sm text-gray-500 animate-pulse-soft">{message}</p>
      {batchLabel && (
        <p className="mt-1 text-xs font-medium text-brand-teal">{batchLabel}</p>
      )}
      {typeof progress === "number" && (
        <div className="mt-6 h-2 w-64 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-brand-orange transition-all duration-500"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}
    </div>
  );
}
