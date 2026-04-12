import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { TrendingUp, TrendingDown, Store, AlertCircle, Building2, Percent } from "lucide-react";

const fmt = (n: number) => n.toLocaleString("th-TH", { maximumFractionDigits: 0 });

function KPI({ label, value, icon: Icon, color }: any) {
  return (
    <div className="card">
      <div className="flex items-center gap-3">
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon size={24} className="text-white" />
        </div>
        <div>
          <div className="text-sm text-slate-500">{label}</div>
          <div className="text-2xl font-bold">{value}</div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => (await api.get("/reports/dashboard")).data,
  });
  if (!data) return <div>กำลังโหลด...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">แดชบอร์ด — เดือน {data.period}</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <KPI label="รายรับเดือนนี้" value={`฿${fmt(data.monthlyIncome)}`} icon={TrendingUp} color="bg-emerald-500" />
        <KPI label="รายจ่ายเดือนนี้" value={`฿${fmt(data.monthlyExpense)}`} icon={TrendingDown} color="bg-rose-500" />
        <KPI
          label="กำไรสุทธิ"
          value={`฿${fmt(data.monthlyNet)}`}
          icon={TrendingUp}
          color={data.monthlyNet >= 0 ? "bg-indigo-500" : "bg-orange-500"}
        />
        <KPI
          label="อัตราการเช่า"
          value={`${data.occupancyRate.toFixed(1)}% (${data.occupiedLocks}/${data.totalLocks})`}
          icon={Percent}
          color="bg-sky-500"
        />
        <KPI label="ยอดค้างชำระ" value={`฿${fmt(data.outstandingAmount)}`} icon={AlertCircle} color="bg-amber-500" />
        <KPI label="มูลค่าทรัพย์สินสุทธิ" value={`฿${fmt(data.assetNetValue)}`} icon={Building2} color="bg-purple-500" />
      </div>
    </div>
  );
}
