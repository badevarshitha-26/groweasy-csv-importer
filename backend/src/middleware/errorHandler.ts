import { Request, Response, NextFunction } from "express";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error("[error]", err);

  if (err instanceof Error) {
    const status =
      err.message.includes("CSV") ||
      err.message.includes("file") ||
      err.message.includes("GEMINI_API_KEY")
        ? 400
        : 500;

    res.status(status).json({
      success: false,
      error: err.message,
    });
    return;
  }

  res.status(500).json({
    success: false,
    error: "Internal server error",
  });
}
