import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import LedgerPage from "../components/LedgerPage";

export default function IncomeExpense() {
  const { data: eventLedger = [] } = useQuery({
    queryKey: ["utility-ledger", "EVENT"],
    queryFn: async () =>
      (await api.get("/utility-ledger", { params: { utilityType: "EVENT" } })).data,
  });
  const { data: utilLedger = [] } = useQuery({
    queryKey: ["utility-ledger", "WATER,ELECTRIC"],
    queryFn: async () =>
      (await api.get("/utility-ledger", { params: { utilityType: "WATER,ELECTRIC" } })).data,
  });
  const { data: bills = [] } = useQuery({
    queryKey: ["utility-bills"],
    queryFn: async () => (await api.get("/expenses/utility-bills")).data,
  });
  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices", "all"],
    queryFn: async () => (await api.get("/invoices")).data,
  });

  const aggregate = (
    items: { period: string; income: number; expense: number }[]
  ) => {
    const byPeriod = new Map<string, { income: number; expense: number }>();
    for (const it of items) {
      const cur = byPeriod.get(it.period) ?? { income: 0, expense: 0 };
      cur.income += it.income;
      cur.expense += it.expense;
      byPeriod.set(it.period, cur);
    }
    return byPeriod;
  };

  const eventAgg = aggregate(
    (eventLedger as any[]).map((l) => ({
      period: l.period,
      income: l.kind === "INCOME" ? l.amount : 0,
      expense: l.kind === "EXPENSE" ? l.amount : 0,
    }))
  );

  const utilAgg = aggregate([
    ...(utilLedger as any[]).map((l) => ({
      period: l.period,
      income: l.kind === "INCOME" ? l.amount : 0,
      expense: l.kind === "EXPENSE" ? l.amount : 0,
    })),
    ...(bills as any[]).map((b) => ({
      period: b.period,
      income: 0,
      expense: (b.electricAmount ?? 0) + (b.waterAmount ?? 0),
    })),
    ...(invoices as any[])
      .filter((inv) => inv.type === "WATER" || inv.type === "ELECTRIC")
      .map((inv) => ({
        period: inv.period,
        income: inv.paidAmount ?? 0,
        expense: 0,
      })),
  ]);

  const periods = Array.from(new Set([...eventAgg.keys(), ...utilAgg.keys()]));
  const extraRows = periods.flatMap((p) => {
    const out: any[] = [];
    const ev = eventAgg.get(p);
    if (ev && (ev.income || ev.expense)) {
      out.push({
        period: p,
        date: `${p}-01`,
        detail: "งานอีเวนต์",
        income: ev.income,
        expense: ev.expense,
        sortPriority: 1,
      });
    }
    const ut = utilAgg.get(p);
    if (ut && (ut.income || ut.expense)) {
      out.push({
        period: p,
        date: `${p}-01`,
        detail: "ค่าน้ำค่าไฟ",
        income: ut.income,
        expense: ut.expense,
        sortPriority: 2,
      });
    }
    return out;
  });

  return (
    <LedgerPage
      title="รายรับรายจ่าย"
      ledgerType="GENERAL"
      extraRows={extraRows}
    />
  );
}
