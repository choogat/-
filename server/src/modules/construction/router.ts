import { Router } from "express";
import { z } from "zod";
import { Role } from "../../lib/enums.js";
import { prisma } from "../../lib/prisma.js";
import { ah } from "../../utils/asyncHandler.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { syncConstructionAsset, syncProjectAssets } from "./assetSync.js";

export const constructionRouter = Router();
constructionRouter.use(requireAuth);

// ── Projects ───────────────────────────────────────────────
constructionRouter.get(
  "/projects",
  ah(async (_req, res) => {
    const projects = await prisma.constructionProject.findMany({
      include: { expenses: true },
      orderBy: { id: "desc" },
    });
    const result = projects.map((p) => {
      const paid = p.expenses.reduce((s, e) => s + e.amount, 0);
      const wht = p.expenses.reduce((s, e) => s + (e.withholdingTax || 0), 0);
      const assetTotal = (p as any).isAsset
        ? paid
        : p.expenses.reduce((s, e: any) => s + (e.isAsset ? e.amount : 0), 0);
      return {
        id: p.id,
        name: p.name,
        contractor: p.contractor,
        budget: p.budget,
        startDate: p.startDate,
        endDate: p.endDate,
        progressPct: p.progressPct,
        status: p.status,
        paid,
        wht,
        isAsset: !!(p as any).isAsset,
        assetTotal,
        remaining: p.budget - paid - wht,
        installmentCount: p.expenses.length,
      };
    });
    res.json(result);
  })
);

constructionRouter.post(
  "/projects",
  requireRole(Role.ADMIN, Role.MANAGER, Role.STAFF),
  ah(async (req, res) => {
    const body = z
      .object({
        name: z.string().min(1),
        contractor: z.string().optional().nullable(),
        budget: z.number().nonnegative(),
        startDate: z.string().optional().nullable(),
        endDate: z.string().optional().nullable(),
        status: z.string().optional(),
        isAsset: z.boolean().optional(),
      })
      .parse(req.body);
    const item = await prisma.constructionProject.create({
      data: {
        name: body.name,
        contractor: body.contractor || null,
        budget: body.budget,
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
        status: body.status ?? "ACTIVE",
        isAsset: body.isAsset ?? false,
      } as any,
    });
    res.status(201).json(item);
  })
);

constructionRouter.patch(
  "/projects/:id",
  requireRole(Role.ADMIN, Role.MANAGER, Role.STAFF),
  ah(async (req, res) => {
    const id = Number(req.params.id);
    const b = req.body as any;
    const data: any = {};
    if (b.name !== undefined) data.name = b.name;
    if (b.contractor !== undefined) data.contractor = b.contractor || null;
    if (b.budget !== undefined) data.budget = Number(b.budget);
    if (b.status !== undefined) data.status = b.status;
    if (b.progressPct !== undefined) data.progressPct = Number(b.progressPct);
    if (b.startDate !== undefined) data.startDate = b.startDate ? new Date(b.startDate) : null;
    if (b.endDate !== undefined) data.endDate = b.endDate ? new Date(b.endDate) : null;
    if (b.isAsset !== undefined) data.isAsset = !!b.isAsset;
    const item = await prisma.constructionProject.update({ where: { id }, data });
    if (b.isAsset !== undefined) await syncProjectAssets(id);
    res.json(item);
  })
);

constructionRouter.delete(
  "/projects/:id",
  requireRole(Role.ADMIN, Role.MANAGER),
  ah(async (req, res) => {
    const id = Number(req.params.id);
    const exps = await prisma.constructionExpense.findMany({ where: { projectId: id }, select: { id: true } });
    for (const e of exps) {
      await prisma.asset.deleteMany({ where: { code: `CON-EXP-${e.id}` } });
    }
    await prisma.constructionExpense.deleteMany({ where: { projectId: id } });
    await prisma.constructionProject.delete({ where: { id } });
    res.status(204).end();
  })
);

// ── All installments (flat list with project info) ─────────
constructionRouter.get(
  "/installments",
  ah(async (_req, res) => {
    const items = await prisma.constructionExpense.findMany({
      include: { project: true },
      orderBy: { date: "desc" },
    });
    res.json(
      items.map((i: any) => ({
        id: i.id,
        projectId: i.projectId,
        projectName: i.project.name,
        projectStartDate: i.project.startDate,
        contractor: i.project.contractor,
        date: i.date,
        description: i.description,
        amount: i.amount,
        withholdingTax: i.withholdingTax,
        isAsset: !!i.isAsset,
        receiptNo: i.receiptNo,
      }))
    );
  })
);

// ── Installments (งวดการจ่าย) ───────────────────────────────
constructionRouter.get(
  "/projects/:id/installments",
  ah(async (req, res) => {
    const projectId = Number(req.params.id);
    const items = await prisma.constructionExpense.findMany({
      where: { projectId },
      orderBy: { date: "asc" },
    });
    res.json(items);
  })
);

constructionRouter.post(
  "/projects/:id/installments",
  requireRole(Role.ADMIN, Role.MANAGER, Role.STAFF),
  ah(async (req, res) => {
    const projectId = Number(req.params.id);
    const body = z
      .object({
        date: z.string(),
        description: z.string().min(1),
        amount: z.number().positive(),
        receiptNo: z.string().optional().nullable(),
        hasWht: z.boolean().optional(),
        isAsset: z.boolean().optional(),
      })
      .parse(req.body);
    const withholdingTax = body.hasWht ? (body.amount / 0.99) * 0.03 : 0;
    const item = await prisma.constructionExpense.create({
      data: {
        projectId,
        date: new Date(body.date),
        description: body.description,
        amount: body.amount,
        withholdingTax,
        isAsset: body.isAsset ?? false,
        receiptNo: body.receiptNo || null,
      } as any,
    });
    await syncConstructionAsset(item.id);
    res.status(201).json(item);
  })
);

constructionRouter.patch(
  "/installments/:id",
  requireRole(Role.ADMIN, Role.MANAGER, Role.STAFF),
  ah(async (req, res) => {
    const id = Number(req.params.id);
    const b = req.body as any;
    const data: any = {};
    if (b.date !== undefined) data.date = new Date(b.date);
    if (b.description !== undefined) data.description = b.description;
    if (b.amount !== undefined) data.amount = Number(b.amount);
    if (b.receiptNo !== undefined) data.receiptNo = b.receiptNo || null;
    if (b.isAsset !== undefined) data.isAsset = !!b.isAsset;
    if (b.hasWht !== undefined) {
      const amt = b.amount !== undefined
        ? Number(b.amount)
        : (await prisma.constructionExpense.findUnique({ where: { id } }))?.amount ?? 0;
      data.withholdingTax = b.hasWht ? (amt / 0.99) * 0.03 : 0;
    }
    const item = await prisma.constructionExpense.update({ where: { id }, data });
    await syncConstructionAsset(id);
    res.json(item);
  })
);

constructionRouter.delete(
  "/installments/:id",
  requireRole(Role.ADMIN, Role.MANAGER),
  ah(async (req, res) => {
    const id = Number(req.params.id);
    const asset = await prisma.asset.findUnique({ where: { code: `CON-EXP-${id}` } });
    if (asset) {
      await prisma.assetDepreciationLog.deleteMany({ where: { assetId: asset.id } });
      await prisma.asset.delete({ where: { id: asset.id } });
    }
    await prisma.constructionExpense.delete({ where: { id } });
    res.status(204).end();
  })
);
