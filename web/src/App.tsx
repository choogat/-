import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/auth";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Locks from "./pages/Locks";
import Tenants from "./pages/Tenants";
import Contracts from "./pages/Contracts";
import Invoices from "./pages/Invoices";
import WaterReadings from "./pages/WaterReadings";
import ElectricReadings from "./pages/ElectricReadings";
import Expenses from "./pages/Expenses";
import UtilityBills from "./pages/UtilityBills";
import Assets from "./pages/Assets";
import ReportDaily from "./pages/ReportDaily";
import ReportMonthly from "./pages/ReportMonthly";
import Overdue from "./pages/Overdue";
import Settings from "./pages/Settings";

function Protected({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (import.meta.env.VITE_AUTH_DISABLED === "true") return children;
  if (loading) return <div className="p-8 text-center">กำลังโหลด...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <Protected>
              <Layout />
            </Protected>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="locks" element={<Locks />} />
          <Route path="tenants" element={<Tenants />} />
          <Route path="contracts" element={<Contracts />} />
          <Route path="invoices" element={<Invoices />} />
          <Route path="water-readings" element={<WaterReadings />} />
          <Route path="electric-readings" element={<ElectricReadings />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="utility-bills" element={<UtilityBills />} />
          <Route path="assets" element={<Assets />} />
          <Route path="reports/daily" element={<ReportDaily />} />
          <Route path="reports/monthly" element={<ReportMonthly />} />
          <Route path="reports/overdue" element={<Overdue />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
