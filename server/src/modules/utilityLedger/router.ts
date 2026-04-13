import { Router } from "express";
import { z } from "zod";
import dayjs from "dayjs";
import { Role } from "../../lib/enums.js";
import { prisma } from "../../lib/prisma.js";
import { ah } from "../../utils/asyncHandler.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";

export const utilityLedgerRouter = Router();
utilityLedgerRouter.use(requireAuth);

utilityLedgerRouter.get(
  "/",
  ah(async (_req, res) => {
    const items = await (prisma as any).utilityLedger.findMany({
      orderBy: { date: "desc" },
    });
    res.json(items);
  })
);

utilityLedgerRouter.post(
  "/",
  requireRole(Role.ADMIN, Role.MANAGER, Role.STAFF),
  ah(async (req, res) => {
    const body = z
      .object({
        date: z.string(),
        kind: z.enum(["INCOME", "EXPENSE"]),
        utilityType: z.enum(["WATER", "ELECTRIC"]),
        party: z.string().min(1),
        amount: z.number().positive(),
        note: z.string().optional(),
      })
      .parse(req.body);
    const period = dayjs(body.date).format("YYYY-MM");
    const item = await (prisma as any).utilityLedger.create({
      data: { ...body, date: new Date(body.date), period },
    });
    res.status(201).json(item);
  })
);

utilityLedgerRouter.delete(
  "/:id",
  requireRole(Role.ADMIN, Role.MANAGER),
  ah(async (req, res) => {
    await (prisma as any).utilityLedger.delete({ where: { id: Number(req.params.id) } });
    res.json({ ok: true });
  })
);
