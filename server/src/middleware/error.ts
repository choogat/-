import { ErrorRequestHandler } from "express";
import { ZodError } from "zod";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: "ValidationError", details: err.errors });
  }
  const status = err.status ?? 500;
  res.status(status).json({ error: err.message ?? "InternalError" });
};

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
