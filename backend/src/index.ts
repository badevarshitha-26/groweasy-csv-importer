import "dotenv/config";
import express from "express";
import cors from "cors";
import { importRouter } from "./routes/importRoutes";
import { errorHandler } from "./middleware/errorHandler";

const app = express();
const PORT = Number(process.env.PORT || 4000);
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";

app.use(
  cors({
    origin: CORS_ORIGIN.split(",").map((s) => s.trim()),
    methods: ["GET", "POST", "OPTIONS"],
  })
);
app.use(express.json({ limit: "10mb" }));

app.get("/health", (_req, res) => {
  const key = process.env.GEMINI_API_KEY || "";
  const hasKey = Boolean(
    key && key !== "your_gemini_api_key_here" && key.trim().length > 10
  );
  res.json({
    status: "ok",
    service: "groweasy-csv-importer",
    hasGeminiKey: hasKey,
    mode: hasKey ? "ai" : "demo-heuristic",
  });
});

app.use("/api", importRouter);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`GrowEasy API running on http://localhost:${PORT}`);
});

export default app;
