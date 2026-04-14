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
  ah(async (req, res) => {
    const { utilityType } = req.query as any;
    const where: any = {};
    if (utilityType) {
      const types = String(utilityType).split(",");
      where.utilityType = { in: types };
    }
    const items = await (prisma as any).utilityLedger.findMany({
      where,
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
        utilityType: z.string().min(1),
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

utilityLedgerRouter.patch(
  "/:id",
  requireRole(Role.ADMIN, Role.MANAGER, Role.STAFF),
  ah(async (req, res) => {
    const body = z
      .object({
        date: z.string().optional(),
        party: z.string().optional(),
        amount: z.number().positive().optional(),
        note: z.string().optional().nullable(),
      })
      .parse(req.body);
    const data: any = {};
    if (body.date !== undefined) {
      data.date = new Date(body.date);
      data.period = dayjs(body.date).format("YYYY-MM");
    }
    if (body.party !== undefined) data.party = body.party;
    if (body.amount !== undefined) data.amount = body.amount;
    if (body.note !== undefined) data.note = body.note ?? null;
    const item = await (prisma as any).utilityLedger.update({
      where: { id: Number(req.params.id) },
      data,
    });
    res.json(item);
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
