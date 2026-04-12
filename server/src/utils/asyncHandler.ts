import { RequestHandler } from "express";

export const ah =
  (fn: (req: any, res: any, next: any) => Promise<any>): RequestHandler =>
  (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);
