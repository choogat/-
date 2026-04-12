import { Router } from "express";
import { Role } from "../../lib/enums.js";
import { prisma } from "../../lib/prisma.js";
import { ah } from "../../utils/asyncHandler.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";

export const settingsRouter = Router();
settingsRouter.use(requireAuth);

settingsRouter.get(
  "/",
  ah(async (_req, res) => {
    const items = await prisma.setting.findMany();
    res.json(Object.fromEntries(items.map((s) => [s.key, s.value])));
  })
);

settingsRouter.patch(
  "/",
  requireRole(Role.ADMIN, Role.MANAGER),
  ah(async (req, res) => {
    const entries = Object.entries(req.body as Record<string, string>);
    for (const [key, value] of entries) {
      await prisma.setting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      });
    }
    res.json({ updated: entries.length });
  })
);
