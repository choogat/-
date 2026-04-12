import { Router } from "express";
import { z } from "zod";
import dayjs from "dayjs";
import { Role, InvoiceType, InvoiceStatus, ContractStatus } from "../../lib/enums.js";
import { prisma } from "../../lib/prisma.js";
import { ah } from "../../utils/asyncHandler.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";

export const invoicesRouter = Router();
invoicesRouter.use(requireAuth);

async function nextInvoiceNo(prefix: string) {
  const count = await prisma.invoice.count({ where: { invoiceNo: { startsWith: prefix } } });
  return `${prefix}-${String(count + 1).padStart(5, "0")}`;
}

invoicesRouter.get(
  "/",
  ah(async (req, res) => {
    const { status, period, contractId } = req.query as any;
    const where: any = {};
    if (status) where.status = status;
    if (period) where.period = period;
    if (contractId) where.contractId = Number(contractId);
    const items = await prisma.invoice.findMany({
      where,
      include: { contract: { include: { lock: true, tenant: true } }, items: true, payments: true },
      orderBy: { issuedAt: "desc" },
    });
    res.json(items);
  })
);

invoicesRouter.get(
  "/:id",
  ah(async (req, res) => {
    const inv = await prisma.invoice.findUnique({
      where: { id: Number(req.params.id) },
      include: { contract: { include: { lock: true, tenant: true } }, items: true, payments: true },
    });
    res.json(inv);
  })
);

/** สร้างใบแจ้งหนี้รายเดือน (ค่าเช่า+ค่าส่วนกลาง) สำหรับสัญญา ACTIVE ทุกสัญญา */
invoicesRouter.post(
  "/generate-monthly",
  requireRole(Role.ADMIN, Role.MANAGER),
  ah(async (req, res) => {
    const { period } = z.object({ period: z.string().regex(/^\d{4}-\d{2}$/) }).parse(req.body);
    const dueDay = Number((await prisma.setting.findUnique({ where: { key: "DUE_DAY" } }))?.value ?? 5);
    const dueDate = dayjs(`${period}-01`).date(dueDay).toDate();

    const contracts = await prisma.lockContract.findMany({ where: { status: ContractStatus.ACTIVE } });
    const created: any[] = [];
    for (const c of contracts) {
      for (const type of [InvoiceType.RENT, InvoiceType.COMMON] as const) {
        const exists = await prisma.invoice.findFirst({ where: { contractId: c.id, type, period } });
        if (exists) continue;
        const amount = type === InvoiceType.RENT ? c.rentAmount : c.commonFee;
        if (amount <= 0) continue;
        const invoiceNo = await nextInvoiceNo(`${type}-${period}`);
        const inv = await prisma.invoice.create({
          data: {
            invoiceNo,
            contractId: c.id,
            type,
            period,
            dueDate,
            amount,
            items: {
              create: [
                {
                  description: type === InvoiceType.RENT ? `ค่าเช่าล็อค ${period}` : `ค่าส่วนกลาง ${period}`,
                  quantity: 1,
                  unitPrice: amount,
                  amount,
                },
              ],
            },
          },
        });
        created.push(inv);
      }
    }
    res.json({ created: created.length });
  })
);
