import { Router } from "express";
import { z } from "zod";
import { Role, LockStatus, ContractStatus } from "../../lib/enums.js";
import { prisma } from "../../lib/prisma.js";
import { ah } from "../../utils/asyncHandler.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";

export const contractsRouter = Router();
contractsRouter.use(requireAuth);

contractsRouter.get(
  "/",
  ah(async (_req, res) => {
    const items = await prisma.lockContract.findMany({
      include: { lock: true, tenant: true },
      orderBy: { startDate: "desc" },
    });
    res.json(items);
  })
);

contractsRouter.post(
  "/",
  requireRole(Role.ADMIN, Role.MANAGER),
  ah(async (req, res) => {
    const body = z
      .object({
        lockId: z.number(),
        tenantId: z.number(),
        startDate: z.string(),
        endDate: z.string().optional(),
        rentAmount: z.number(),
        commonFee: z.number(),
        depositAmount: z.number().default(0),
      })
      .parse(req.body);
    const contract = await prisma.$transaction(async (tx) => {
      const c = await tx.lockContract.create({
        data: {
          ...body,
          startDate: new Date(body.startDate),
          endDate: body.endDate ? new Date(body.endDate) : null,
          status: ContractStatus.ACTIVE,
        },
      });
      await tx.lock.update({ where: { id: body.lockId }, data: { status: LockStatus.OCCUPIED } });
      return c;
    });
    res.status(201).json(contract);
  })
);

contractsRouter.post(
  "/:id/terminate",
  requireRole(Role.ADMIN, Role.MANAGER),
  ah(async (req, res) => {
    const id = Number(req.params.id);
    const result = await prisma.$transaction(async (tx) => {
      const c = await tx.lockContract.update({
        where: { id },
        data: { status: ContractStatus.TERMINATED, endDate: new Date() },
      });
      await tx.lock.update({ where: { id: c.lockId }, data: { status: LockStatus.VACANT } });
      return c;
    });
    res.json(result);
  })
);
