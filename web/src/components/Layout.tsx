import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard, Store, Users, FileText, Receipt,
  Droplet, Zap, Wallet, Building2, BarChart3, AlertCircle, ArrowLeftRight,
  Settings as SettingsIcon, LogOut, Plug
} from "lucide-react";
import { useAuth } from "../lib/auth";

const nav = [
  { to: "/dashboard", label: "แดชบอร์ด", icon: LayoutDashboard },
  { to: "/contracts", label: "สัญญาเช่า", icon: FileText },
  { to: "/invoices", label: "ใบแจ้งหนี้", icon: Receipt },
  { to: "/expenses", label: "รายจ่าย", icon: Wallet },
  { to: "/income-expense", label: "รายรับรายจ่าย", icon: ArrowLeftRight },
  { to: "/utility-bills", label: "สาธารณูปโภค", icon: Plug },
  { to: "/assets", label: "ทรัพย์สิน", icon: Building2 },
  { to: "/reports/daily", label: "รายงานรายวัน", icon: BarChart3 },
  { to: "/reports/monthly", label: "รายงานรายเดือน", icon: BarChart3 },
  { to: "/reports/overdue", label: "ค้างชำระ", icon: AlertCircle },
  { to: "/settings", label: "ตั้งค่า", icon: SettingsIcon },
];

export default function Layout() {
  const { user, logout } = useAuth();
  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col">
        <div className="p-4 border-b border-slate-800">
          <div className="font-bold text-lg">🏪 ระบบจัดการตลาด</div>
          <div className="text-xs text-slate-400 mt-1">
            {user?.fullName} ({user?.role})
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                  isActive ? "bg-indigo-600 text-white" : "hover:bg-slate-800"
                }`
              }
            >
              <n.icon size={18} />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2 m-2 rounded-lg text-sm hover:bg-red-600/20 text-red-400"
        >
          <LogOut size={18} /> ออกจากระบบ
        </button>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="p-6 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
