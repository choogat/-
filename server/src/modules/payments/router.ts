import { Router } from "express";
import { z } from "zod";
import { Role, InvoiceStatus, PaymentMethod } from "../../lib/enums.js";
import { prisma } from "../../lib/prisma.js";
import { ah } from "../../utils/asyncHandler.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";

export const paymentsRouter = Router();
paymentsRouter.use(requireAuth);

paymentsRouter.post(
  "/",
  requireRole(Role.ADMIN, Role.MANAGER, Role.STAFF),
  ah(async (req, res) => {
    const body = z
      .object({
        invoiceId: z.number(),
        amount: z.number().positive(),
        method: z.nativeEnum(PaymentMethod).default(PaymentMethod.CASH),
        receiptNo: z.string().optional(),
        note: z.string().optional(),
      })
      .parse(req.body);

    const result = await prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.findUnique({ where: { id: body.invoiceId } });
      if (!inv) throw new Error("InvoiceNotFound");
      const payment = await tx.payment.create({
        data: { ...body, receivedByUserId: req.user!.id },
      });
      const paid = inv.paidAmount + body.amount;
      const status =
        paid >= inv.amount ? InvoiceStatus.PAID : paid > 0 ? InvoiceStatus.PARTIAL : InvoiceStatus.PENDING;
      await tx.invoice.update({
        where: { id: inv.id },
        data: { paidAmount: paid, status, paidAt: status === InvoiceStatus.PAID ? new Date() : null },
      });
      return payment;
    });
    res.status(201).json(result);
  })
);
