import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export default function UtilityBills() {
  const { data: bills = [] } = useQuery({
    queryKey: ["utility-bills"],
    queryFn: async () => (await api.get("/expenses/utility-bills")).data,
  });
  const { data: waterInvoices = [] } = useQuery({
    queryKey: ["invoices", "WATER"],
    queryFn: async () => (await api.get("/invoices", { params: {} })).data,
  });

  const incomeByPeriod = new Map<string, number>();
  for (const inv of waterInvoices as any[]) {
    if (inv.type !== "WATER" && inv.type !== "ELECTRIC") continue;
    incomeByPeriod.set(
      inv.period,
      (incomeByPeriod.get(inv.period) ?? 0) + (inv.paidAmount ?? 0)
    );
  }

  const expenseByPeriod = new Map<string, number>();
  for (const b of bills as any[]) {
    expenseByPeriod.set(b.period, (b.electricAmount ?? 0) + (b.waterAmount ?? 0));
  }

  const periods = Array.from(
    new Set([...incomeByPeriod.keys(), ...expenseByPeriod.keys()])
  ).sort((a, b) => b.localeCompare(a));

  const totalIncome = [...incomeByPeriod.values()].reduce((s, v) => s + v, 0);
  const totalExpense = [...expenseByPeriod.values()].reduce((s, v) => s + v, 0);
  const net = totalIncome - totalExpense;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">ค่าน้ำค่าไฟ</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="card">
          <div className="text-sm text-slate-500">รายรับค่าน้ำค่าไฟรวม</div>
          <div className="text-2xl font-bold text-emerald-600">
            ฿{totalIncome.toLocaleString()}
          </div>
        </div>
        <div className="card">
          <div className="text-sm text-slate-500">รายจ่ายค่าน้ำค่าไฟรวม</div>
          <div className="text-2xl font-bold text-rose-600">
            ฿{totalExpense.toLocaleString()}
          </div>
        </div>
        <div className="card">
          <div className="text-sm text-slate-500">ผลรวมสุทธิ</div>
          <div className={`text-2xl font-bold ${net >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
            ฿{net.toLocaleString()}
          </div>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left border-b">
            <tr>
              <th className="p-2">งวด</th>
              <th className="p-2 text-right">รายรับค่าน้ำค่าไฟ</th>
              <th className="p-2 text-right">รายจ่ายค่าน้ำค่าไฟ</th>
              <th className="p-2 text-right">คงเหลือ</th>
            </tr>
          </thead>
          <tbody>
            {periods.length === 0 && (
              <tr><td className="p-4 text-center text-slate-400" colSpan={4}>ไม่มีข้อมูล</td></tr>
            )}
            {periods.map((p) => {
              const inc = incomeByPeriod.get(p) ?? 0;
              const exp = expenseByPeriod.get(p) ?? 0;
              const diff = inc - exp;
              return (
                <tr key={p} className="border-b">
                  <td className="p-2">{p}</td>
                  <td className="p-2 text-right text-emerald-600">฿{inc.toLocaleString()}</td>
                  <td className="p-2 text-right text-rose-600">฿{exp.toLocaleString()}</td>
                  <td className={`p-2 text-right font-semibold ${diff >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    ฿{diff.toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t font-bold bg-slate-50">
              <td className="p-2">รวมทั้งหมด</td>
              <td className="p-2 text-right text-emerald-600">฿{totalIncome.toLocaleString()}</td>
              <td className="p-2 text-right text-rose-600">฿{totalExpense.toLocaleString()}</td>
              <td className={`p-2 text-right ${net >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                ฿{net.toLocaleString()}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
