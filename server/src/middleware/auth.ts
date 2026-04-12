import { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { Role } from "../lib/enums.js";
import { HttpError } from "./error.js";

export interface AuthUser {
  id: number;
  username: string;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const authDisabled = () => process.env.AUTH_DISABLED === "true";

export const requireAuth: RequestHandler = (req, _res, next) => {
  if (authDisabled()) {
    req.user = { id: 1, username: "admin", role: "ADMIN" as Role };
    return next();
  }
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) throw new HttpError(401, "Unauthorized");
  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as AuthUser;
    req.user = payload;
    next();
  } catch {
    throw new HttpError(401, "InvalidToken");
  }
};

export const requireRole =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (authDisabled()) return next();
    if (!req.user) throw new HttpError(401, "Unauthorized");
    if (!roles.includes(req.user.role)) throw new HttpError(403, "Forbidden");
    next();
  };
