import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../lib/auth";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [username, setU] = useState("admin");
  const [password, setP] = useState("admin123");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await login(username, password);
      nav("/dashboard");
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? "เข้าสู่ระบบไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 p-4">
      <form onSubmit={submit} className="card w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-2">🏪 ระบบจัดการตลาด</h1>
        <p className="text-center text-slate-500 mb-6">เข้าสู่ระบบเพื่อใช้งาน</p>
        <div className="space-y-4">
          <div>
            <label className="label">ชื่อผู้ใช้</label>
            <input className="input" value={username} onChange={(e) => setU(e.target.value)} />
          </div>
          <div>
            <label className="label">รหัสผ่าน</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setP(e.target.value)}
            />
          </div>
          <button className="btn-primary w-full justify-center" disabled={loading}>
            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>
          <div className="text-xs text-slate-500 text-center">
            ทดลอง: admin/admin123 · manager/manager123 · staff/staff123
          </div>
        </div>
      </form>
    </div>
  );
}
