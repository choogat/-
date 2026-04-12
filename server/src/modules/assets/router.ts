import { Router } from "express";
import { Role } from "../../lib/enums.js";
import { prisma } from "../../lib/prisma.js";
import { ah } from "../../utils/asyncHandler.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";

export const assetsRouter = Router();
assetsRouter.use(requireAuth);

assetsRouter.get(
  "/categories",
  ah(async (_req, res) => {
    res.json(await prisma.assetCategory.findMany());
  })
);

assetsRouter.get(
  "/",
  ah(async (_req, res) => {
    res.json(
      await prisma.asset.findMany({ include: { category: true }, orderBy: { acquireDate: "desc" } })
    );
  })
);

assetsRouter.post(
  "/",
  requireRole(Role.ADMIN, Role.MANAGER),
  ah(async (req, res) => {
    const b = req.body;
    const item = await prisma.asset.create({
      data: {
        ...b,
        acquireDate: new Date(b.acquireDate),
        currentValue: b.currentValue ?? b.costPrice,
      },
    });
    res.status(201).json(item);
  })
);

assetsRouter.delete(
  "/:id",
  requireRole(Role.ADMIN, Role.MANAGER),
  ah(async (req, res) => {
    const id = Number(req.params.id);
    await prisma.assetDepreciationLog.deleteMany({ where: { assetId: id } });
    await prisma.asset.delete({ where: { id } });
    res.status(204).end();
  })
);

/** คำนวณค่าเสื่อมรายเดือน (Straight-line) */
assetsRouter.post(
  "/depreciate",
  requireRole(Role.ADMIN, Role.MANAGER),
  ah(async (req, res) => {
    const { period } = req.body as { period: string };
    const assets = await prisma.asset.findMany({ where: { usefulLifeYears: { gt: 0 } } });
    let total = 0;
    for (const a of assets) {
      const monthly = a.costPrice / (a.usefulLifeYears * 12);
      const newAccum = Math.min(a.costPrice, a.accumulatedDepreciation + monthly);
      const bookValue = a.costPrice - newAccum;
      await prisma.$transaction([
        prisma.asset.update({
          where: { id: a.id },
          data: { accumulatedDepreciation: newAccum, currentValue: bookValue },
        }),
        prisma.assetDepreciationLog.create({
          data: { assetId: a.id, period, amount: monthly, bookValue },
        }),
      ]);
      total += monthly;
    }
    res.json({ period, totalDepreciation: total, assetsProcessed: assets.length });
  })
);
