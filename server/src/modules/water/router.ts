import { Router } from "express";
import { z } from "zod";
import dayjs from "dayjs";
import { Role, InvoiceType } from "../../lib/enums.js";
import { prisma } from "../../lib/prisma.js";
import { ah } from "../../utils/asyncHandler.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";

export const waterRouter = Router();
waterRouter.use(requireAuth);

waterRouter.get(
  "/",
  ah(async (_req, res) => {
    const items = await prisma.waterMeterReading.findMany({
      include: { lock: true, invoice: true },
      orderBy: { readingDate: "desc" },
    });
    res.json(items);
  })
);

waterRouter.post(
  "/",
  requireRole(Role.ADMIN, Role.MANAGER, Role.STAFF),
  ah(async (req, res) => {
    const body = z
      .object({
        lockId: z.number(),
        readingDate: z.string(),
        period: z.string().regex(/^\d{4}-\d{2}$/),
        meterStart: z.number(),
        meterEnd: z.number(),
        ratePerUnit: z.number().optional(),
        createInvoice: z.boolean().default(true),
      })
      .parse(req.body);

    const rate =
      body.ratePerUnit ??
      Number((await prisma.setting.findUnique({ where: { key: "WATER_RATE" } }))?.value ?? 18);
    const unitsUsed = Math.max(0, body.meterEnd - body.meterStart);
    const totalAmount = unitsUsed * rate;
    const dueDay = Number((await prisma.setting.findUnique({ where: { key: "DUE_DAY" } }))?.value ?? 5);

    const result = await prisma.$transaction(async (tx) => {
      let invoiceId: number | undefined;
      if (body.createInvoice && totalAmount > 0) {
        const contract = await tx.lockContract.findFirst({
          where: { lockId: body.lockId, status: "ACTIVE" },
        });
        const count = await tx.invoice.count({ where: { invoiceNo: { startsWith: `WATER-${body.period}` } } });
        const inv = await tx.invoice.create({
          data: {
            invoiceNo: `WATER-${body.period}-${String(count + 1).padStart(5, "0")}`,
            contractId: contract?.id,
            type: InvoiceType.WATER,
            period: body.period,
            dueDate: dayjs(`${body.period}-01`).date(dueDay).toDate(),
            amount: totalAmount,
            items: {
              create: [
                {
                  description: `ค่าน้ำ ${body.period} (${unitsUsed} หน่วย × ${rate})`,
                  quantity: unitsUsed,
                  unitPrice: rate,
                  amount: totalAmount,
                },
              ],
            },
          },
        });
        invoiceId = inv.id;
      }
      return tx.waterMeterReading.create({
        data: {
          lockId: body.lockId,
          readingDate: new Date(body.readingDate),
          period: body.period,
          meterStart: body.meterStart,
          meterEnd: body.meterEnd,
          unitsUsed,
          ratePerUnit: rate,
          totalAmount,
          invoiceId,
        },
      });
    });
    res.status(201).json(result);
  })
);
