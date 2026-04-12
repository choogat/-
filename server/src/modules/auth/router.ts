import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { ah } from "../../utils/asyncHandler.js";
import { requireAuth } from "../../middleware/auth.js";
import { HttpError } from "../../middleware/error.js";

export const authRouter = Router();

authRouter.post(
  "/login",
  ah(async (req, res) => {
    const { username, password } = z
      .object({ username: z.string(), password: z.string() })
      .parse(req.body);
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || !user.isActive) throw new HttpError(401, "InvalidCredentials");
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new HttpError(401, "InvalidCredentials");
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN ?? "7d" }
    );
    res.json({
      token,
      user: { id: user.id, username: user.username, fullName: user.fullName, role: user.role },
    });
  })
);

authRouter.get(
  "/me",
  requireAuth,
  ah(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) throw new HttpError(404, "NotFound");
    res.json({
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
    });
  })
);
