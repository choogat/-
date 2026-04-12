import cron from "node-cron";
import { InvoiceStatus } from "../lib/enums.js";
import { prisma } from "../lib/prisma.js";

export function startCronJobs() {
  // ทุกวันเวลา 01:00 — mark overdue invoices
  cron.schedule("0 1 * * *", async () => {
    const today = new Date();
    const res = await prisma.invoice.updateMany({
      where: {
        status: { in: [InvoiceStatus.PENDING, InvoiceStatus.PARTIAL] },
        dueDate: { lt: today },
      },
      data: { status: InvoiceStatus.OVERDUE },
    });
    console.log(`[cron] marked ${res.count} invoices as OVERDUE`);
  });

  console.log("⏰ Cron jobs started");
}
