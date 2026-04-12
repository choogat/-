import { Router } from "express";
import { z } from "zod";
import { Role } from "../../lib/enums.js";
import { prisma } from "../../lib/prisma.js";
import { ah } from "../../utils/asyncHandler.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";

export const expensesRouter = Router();
expensesRouter.use(requireAuth);

expensesRouter.get(
  "/categories",
  ah(async (_req, res) => {
    res.json(await prisma.expenseCategory.findMany({ orderBy: { type: "asc" } }));
  })
);

expensesRouter.get(
  "/",
  ah(async (req, res) => {
    const { type, from, to } = req.query as any;
    const where: any = {};
    if (type) where.category = { type };
    if (from || to) where.date = {};
    if (from) where.date.gte = new Date(from);
    if (to) where.date.lte = new Date(to);
    const items = await prisma.expense.findMany({
      where,
      include: { category: true, approvedBy: true },
      orderBy: { date: "desc" },
    });
    res.json(items);
  })
);

expensesRouter.post(
  "/",
  requireRole(Role.ADMIN, Role.MANAGER, Role.STAFF),
  ah(async (req, res) => {
    const body = z
      .object({
        date: z.string(),
        categoryId: z.number(),
        description: z.string().optional(),
        amount: z.number().positive(),
        receiptNo: z.string().optional(),
        attachmentUrl: z.string().optional(),
        note: z.string().optional(),
      })
      .parse(req.body);
    const item = await prisma.expense.create({
      data: { ...body, date: new Date(body.date), approvedByUserId: req.user!.id } as any,
    });
    res.status(201).json(item);
  })
);

// Utility bills
expensesRouter.get(
  "/utility-bills",
  ah(async (_req, res) => {
    res.json(await prisma.utilityBill.findMany({ orderBy: { period: "desc" } }));
  })
);

expensesRouter.post(
  "/utility-bills",
  requireRole(Role.ADMIN, Role.MANAGER),
  ah(async (req, res) => {
    const b = req.body;
    const total =
      (b.electricAmount ?? 0) +
      (b.waterAmount ?? 0) +
      (b.internetAmount ?? 0) +
      (b.garbageAmount ?? 0) +
      (b.wasteWaterAmount ?? 0);
    const item = await prisma.utilityBill.upsert({
      where: { period: b.period },
      update: { ...b, totalAmount: total },
      create: { ...b, totalAmount: total },
    });
    res.status(201).json(item);
  })
);
