import { Router } from "express";
import dayjs from "dayjs";
import { InvoiceStatus, LockStatus } from "../../lib/enums.js";
import { prisma } from "../../lib/prisma.js";
import { ah } from "../../utils/asyncHandler.js";
import { requireAuth } from "../../middleware/auth.js";

export const reportsRouter = Router();
reportsRouter.use(requireAuth);

reportsRouter.get(
  "/dashboard",
  ah(async (_req, res) => {
    const period = dayjs().format("YYYY-MM");
    const today = dayjs().format("YYYY-MM-DD");
    const monthStart = dayjs().startOf("month").toDate();
    const monthEnd = dayjs().endOf("month").toDate();
    const dayStart = dayjs().startOf("day").toDate();
    const dayEnd = dayjs().endOf("day").toDate();

    const [payments, expenses, locks, occupied, overdue, assets, dailyPay, dailyExp] = await Promise.all([
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { paidAt: { gte: monthStart, lte: monthEnd } },
      }),
      prisma.expense.aggregate({
        _sum: { amount: true },
        where: { date: { gte: monthStart, lte: monthEnd } },
      }),
      prisma.lock.count(),
      prisma.lock.count({ where: { status: LockStatus.OCCUPIED } }),
      prisma.invoice.aggregate({
        _sum: { amount: true },
        where: { status: { in: [InvoiceStatus.PENDING, InvoiceStatus.OVERDUE, InvoiceStatus.PARTIAL] } },
      }),
      prisma.asset.aggregate({ _sum: { currentValue: true } }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { paidAt: { gte: dayStart, lte: dayEnd } },
      }),
      prisma.expense.aggregate({
        _sum: { amount: true },
        where: { date: { gte: dayStart, lte: dayEnd } },
      }),
    ]);

    const income = payments._sum.amount ?? 0;
    const expense = expenses._sum.amount ?? 0;
    const dailyIncome = dailyPay._sum.amount ?? 0;
    const dailyExpense = dailyExp._sum.amount ?? 0;

    res.json({
      period,
      today,
      dailyIncome,
      dailyExpense,
      dailyNet: dailyIncome - dailyExpense,
      monthlyIncome: income,
      monthlyExpense: expense,
      monthlyNet: income - expense,
      totalLocks: locks,
      occupiedLocks: occupied,
      occupancyRate: locks ? (occupied / locks) * 100 : 0,
      outstandingAmount: overdue._sum.amount ?? 0,
      assetNetValue: assets._sum.currentValue ?? 0,
    });
  })
);

reportsRouter.get(
  "/daily",
  ah(async (req, res) => {
    const date = (req.query.date as string) ?? dayjs().format("YYYY-MM-DD");
    const start = dayjs(date).startOf("day").toDate();
    const end = dayjs(date).endOf("day").toDate();
    const [payments, expenses] = await Promise.all([
      prisma.payment.findMany({
        where: { paidAt: { gte: start, lte: end } },
        include: { invoice: true },
      }),
      prisma.expense.findMany({
        where: { date: { gte: start, lte: end } },
        include: { category: true },
      }),
    ]);
    const totalIncome = payments.reduce((s, p) => s + p.amount, 0);
    const totalExpense = expenses.reduce((s, e) => s + e.amount, 0);
    res.json({ date, payments, expenses, totalIncome, totalExpense, net: totalIncome - totalExpense });
  })
);

reportsRouter.get(
  "/monthly",
  ah(async (req, res) => {
    const period = (req.query.period as string) ?? dayjs().format("YYYY-MM");
    const start = dayjs(`${period}-01`).startOf("month").toDate();
    const end = dayjs(`${period}-01`).endOf("month").toDate();
    const [incomeByType, expenseByType] = await Promise.all([
      prisma.invoice.groupBy({
        by: ["type"],
        _sum: { paidAmount: true },
        where: { period },
      }),
      prisma.expense.groupBy({
        by: ["categoryId"],
        _sum: { amount: true },
        where: { date: { gte: start, lte: end } },
      }),
    ]);
    res.json({ period, incomeByType, expenseByCategory: expenseByType });
  })
);

reportsRouter.get(
  "/overdue",
  ah(async (_req, res) => {
    const today = new Date();
    const items = await prisma.invoice.findMany({
      where: {
        status: { in: [InvoiceStatus.PENDING, InvoiceStatus.OVERDUE, InvoiceStatus.PARTIAL] },
        dueDate: { lt: today },
      },
      include: { contract: { include: { lock: true, tenant: true } } },
      orderBy: { dueDate: "asc" },
    });
    res.json(
      items.map((i) => ({
        ...i,
        daysOverdue: Math.max(0, dayjs(today).diff(dayjs(i.dueDate), "day")),
      }))
    );
  })
);

reportsRouter.get(
  "/occupancy",
  ah(async (_req, res) => {
    const total = await prisma.lock.count();
    const occupied = await prisma.lock.count({ where: { status: LockStatus.OCCUPIED } });
    res.json({ total, occupied, vacant: total - occupied, rate: total ? (occupied / total) * 100 : 0 });
  })
);
