import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import { parseCsvText } from "../utils/csvParser";
import {
  createJobId,
  getJob,
  jobsSeed,
  markJobFailed,
  processImport,
  runImportSync,
} from "../services/importService";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok =
      file.mimetype === "text/csv" ||
      file.mimetype === "application/vnd.ms-excel" ||
      file.mimetype === "application/csv" ||
      file.mimetype === "text/plain" ||
      file.originalname.toLowerCase().endsWith(".csv");
    if (!ok) {
      cb(new Error("Only .csv files are supported (max 5MB)"));
      return;
    }
    cb(null, true);
  },
});

export const importRouter = Router();

function getAiConfig() {
  return {
    apiKey: process.env.GEMINI_API_KEY || "",
    model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
    batchSize: Number(process.env.AI_BATCH_SIZE || 15),
    maxRetries: Number(process.env.AI_MAX_RETRIES || 2),
  };
}

/** Preview only — parse CSV, no AI. */
importRouter.post(
  "/preview",
  upload.single("file"),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, error: "No CSV file uploaded" });
        return;
      }
      const text = req.file.buffer.toString("utf-8");
      const parsed = parseCsvText(text);
      res.json({
        success: true,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        headers: parsed.headers,
        rows: parsed.rows.slice(0, 200),
        totalRows: parsed.totalRows,
        previewLimited: parsed.totalRows > 200,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * Confirm import — runs AI extraction and returns full result.
 * Accepts multipart file OR JSON body with { rows: [...] }.
 */
importRouter.post(
  "/import",
  upload.single("file"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      let rows = (req.body?.rows as Record<string, string>[] | undefined) ?? undefined;

      if (req.file) {
        const text = req.file.buffer.toString("utf-8");
        rows = parseCsvText(text).rows;
      } else if (typeof req.body?.rows === "string") {
        rows = JSON.parse(req.body.rows);
      }

      if (!rows || !Array.isArray(rows) || rows.length === 0) {
        res.status(400).json({
          success: false,
          error: "Provide a CSV file or a non-empty rows array",
        });
        return;
      }

      if (rows.length > 500) {
        res.status(400).json({
          success: false,
          error: "Maximum 500 rows per import for this demo. Split larger files.",
        });
        return;
      }

      const config = getAiConfig();
      const { jobId, result } = await runImportSync({
        rows,
        ...config,
      });

      res.json({
        success: true,
        jobId,
        ...result,
      });
    } catch (err) {
      next(err);
    }
  }
);

/** Async import with progress polling (bonus). */
importRouter.post(
  "/import/async",
  upload.single("file"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      let rows = (req.body?.rows as Record<string, string>[] | undefined) ?? undefined;

      if (req.file) {
        const text = req.file.buffer.toString("utf-8");
        rows = parseCsvText(text).rows;
      } else if (typeof req.body?.rows === "string") {
        rows = JSON.parse(req.body.rows);
      }

      if (!rows || !Array.isArray(rows) || rows.length === 0) {
        res.status(400).json({
          success: false,
          error: "Provide a CSV file or a non-empty rows array",
        });
        return;
      }

      const jobId = createJobId();
      const config = getAiConfig();

      // Seed job so progress polling never 404s before first batch starts
      jobsSeed(jobId, rows.length);

      // Fire and forget
      void processImport({ jobId, rows, ...config }).catch((err) => {
        console.error(`[job ${jobId}] failed`, err);
        markJobFailed(
          jobId,
          err instanceof Error ? err.message : "Import failed"
        );
      });

      res.status(202).json({
        success: true,
        jobId,
        progressUrl: `/api/import/${jobId}/progress`,
        resultsUrl: `/api/import/${jobId}/results`,
      });
    } catch (err) {
      next(err);
    }
  }
);

importRouter.get("/import/:id/progress", (req: Request, res: Response) => {
  const job = getJob(req.params.id);
  if (!job) {
    res.status(404).json({ success: false, error: "Job not found" });
    return;
  }
  res.json({
    success: true,
    jobId: req.params.id,
    ...job,
    result: undefined,
  });
});

importRouter.get("/import/:id/results", (req: Request, res: Response) => {
  const job = getJob(req.params.id);
  if (!job) {
    res.status(404).json({ success: false, error: "Job not found" });
    return;
  }
  if (job.status !== "completed" || !job.result) {
    res.status(202).json({
      success: true,
      status: job.status,
      message: job.message,
    });
    return;
  }
  res.json({
    success: true,
    jobId: req.params.id,
    ...job.result,
  });
});
