import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "../lib/api";

type Project = {
  id: number;
  name: string;
  contractor: string | null;
  budget: number;
  startDate: string | null;
  endDate: string | null;
  status: string;
  progressPct: number;
  paid: number;
  remaining: number;
  installmentCount: number;
};

type Installment = {
  id: number;
  date: string;
  description: string;
  amount: number;
  receiptNo: string | null;
};

const fmt = (n: number) =>
  n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString("th-TH") : "-";

export default function ConstructionExpenses() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showAddProject, setShowAddProject] = useState(false);

  const projectsQ = useQuery<Project[]>({
    queryKey: ["construction-projects"],
    queryFn: async () => (await api.get("/construction/projects")).data,
  });

  const selected = projectsQ.data?.find((p) => p.id === selectedId) ?? null;

  const totalBudget = projectsQ.data?.reduce((s, p) => s + p.budget, 0) ?? 0;
  const totalPaid = projectsQ.data?.reduce((s, p) => s + p.paid, 0) ?? 0;
  const totalRemain = totalBudget - totalPaid;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">ค่าใช้จ่ายก่อสร้าง</h1>
        <button
          onClick={() => setShowAddProject(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          + เพิ่มโครงการ
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <SummaryCard label="ยอดรวมทุกโครงการ" value={fmt(totalBudget)} color="bg-slate-100" />
        <SummaryCard label="จ่ายแล้ว" value={fmt(totalPaid)} color="bg-green-100" />
        <SummaryCard label="คงเหลือต้องจ่าย" value={fmt(totalRemain)} color="bg-amber-100" />
      </div>

      {/* Projects table */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="p-3">โครงการ</th>
              <th className="p-3">ผู้รับเหมา</th>
              <th className="p-3 text-right">ยอดรวม</th>
              <th className="p-3 text-right">จ่ายแล้ว</th>
              <th className="p-3 text-right">คงเหลือ</th>
              <th className="p-3 text-center">งวด</th>
              <th className="p-3 text-center">สถานะ</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {projectsQ.data?.map((p) => {
              const pct = p.budget > 0 ? (p.paid / p.budget) * 100 : 0;
              return (
                <tr key={p.id} className="border-t hover:bg-slate-50">
                  <td className="p-3 font-medium">{p.name}</td>
                  <td className="p-3">{p.contractor ?? "-"}</td>
                  <td className="p-3 text-right">{fmt(p.budget)}</td>
                  <td className="p-3 text-right text-green-700">{fmt(p.paid)}</td>
                  <td className="p-3 text-right font-semibold text-amber-700">
                    {fmt(p.remaining)}
                  </td>
                  <td className="p-3 text-center">
                    <div className="text-xs text-slate-500">{p.installmentCount} งวด</div>
                    <div className="w-full bg-slate-200 rounded h-1.5 mt-1">
                      <div
                        className="bg-green-500 h-1.5 rounded"
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">
                      {p.status}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => setSelectedId(p.id)}
                      className="text-blue-600 hover:underline mr-2"
                    >
                      งวดการจ่าย
                    </button>
                    <button
                      onClick={async () => {
                        if (!confirm(`ลบโครงการ "${p.name}"?`)) return;
                        await api.delete(`/construction/projects/${p.id}`);
                        qc.invalidateQueries({ queryKey: ["construction-projects"] });
                        toast.success("ลบแล้ว");
                      }}
                      className="text-red-600 hover:underline"
                    >
                      ลบ
                    </button>
                  </td>
                </tr>
              );
            })}
            {projectsQ.data?.length === 0 && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-slate-500">
                  ยังไม่มีโครงการ — กด "+ เพิ่มโครงการ" เพื่อเริ่ม
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showAddProject && (
        <AddProjectModal
          onClose={() => setShowAddProject(false)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["construction-projects"] });
            setShowAddProject(false);
          }}
        />
      )}

      {selected && (
        <InstallmentModal
          project={selected}
          onClose={() => setSelectedId(null)}
          onChanged={() => {
            qc.invalidateQueries({ queryKey: ["construction-projects"] });
          }}
        />
      )}
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className={`${color} rounded-lg p-4`}>
      <div className="text-sm text-slate-600">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}

function AddProjectModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [contractor, setContractor] = useState("");
  const [budget, setBudget] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const save = useMutation({
    mutationFn: async () => {
      await api.post("/construction/projects", {
        name,
        contractor: contractor || null,
        budget: Number(budget),
        startDate: startDate || null,
        endDate: endDate || null,
      });
    },
    onSuccess: () => {
      toast.success("เพิ่มโครงการแล้ว");
      onSaved();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? "ผิดพลาด"),
  });

  return (
    <Modal title="เพิ่มโครงการก่อสร้าง" onClose={onClose}>
      <div className="space-y-3">
        <Field label="ชื่อโครงการ *">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
            placeholder="เช่น สร้างล็อคโซน A"
          />
        </Field>
        <Field label="ผู้รับเหมา">
          <input
            value={contractor}
            onChange={(e) => setContractor(e.target.value)}
            className="input"
          />
        </Field>
        <Field label="ยอดค่าใช้จ่ายทั้งหมด (บาท) *">
          <input
            type="number"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            className="input"
            placeholder="0.00"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="วันที่เริ่ม">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input"
            />
          </Field>
          <Field label="วันที่สิ้นสุด">
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input"
            />
          </Field>
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onClose} className="px-4 py-2 rounded border">
          ยกเลิก
        </button>
        <button
          onClick={() => {
            if (!name || !budget) return toast.error("กรอกชื่อและยอด");
            save.mutate();
          }}
          disabled={save.isPending}
          className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
        >
          บันทึก
        </button>
      </div>
    </Modal>
  );
}

function InstallmentModal({
  project,
  onClose,
  onChanged,
}: {
  project: Project;
  onClose: () => void;
  onChanged: () => void;
}) {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [receiptNo, setReceiptNo] = useState("");

  const listQ = useQuery<Installment[]>({
    queryKey: ["construction-installments", project.id],
    queryFn: async () =>
      (await api.get(`/construction/projects/${project.id}/installments`)).data,
  });

  const paid = listQ.data?.reduce((s, i) => s + i.amount, 0) ?? project.paid;
  const remaining = project.budget - paid;

  const add = useMutation({
    mutationFn: async () => {
      await api.post(`/construction/projects/${project.id}/installments`, {
        date,
        description,
        amount: Number(amount),
        receiptNo: receiptNo || null,
      });
    },
    onSuccess: () => {
      toast.success("บันทึกงวดแล้ว");
      setDescription("");
      setAmount("");
      setReceiptNo("");
      qc.invalidateQueries({ queryKey: ["construction-installments", project.id] });
      onChanged();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? "ผิดพลาด"),
  });

  const del = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/construction/installments/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["construction-installments", project.id] });
      onChanged();
      toast.success("ลบแล้ว");
    },
  });

  return (
    <Modal title={`งวดการจ่าย — ${project.name}`} onClose={onClose} wide>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <SummaryCard label="ยอดรวม" value={fmt(project.budget)} color="bg-slate-100" />
        <SummaryCard label="จ่ายแล้ว" value={fmt(paid)} color="bg-green-100" />
        <SummaryCard label="คงเหลือ" value={fmt(remaining)} color="bg-amber-100" />
      </div>

      {/* Add installment form */}
      <div className="border rounded-lg p-3 bg-slate-50 mb-4">
        <div className="font-semibold mb-2">บันทึกงวดใหม่</div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
          <input
            placeholder="รายละเอียด เช่น งวดที่ 1"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input md:col-span-2"
          />
          <input
            type="number"
            placeholder="จำนวนเงิน"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="input"
          />
          <input
            placeholder="เลขใบเสร็จ"
            value={receiptNo}
            onChange={(e) => setReceiptNo(e.target.value)}
            className="input"
          />
        </div>
        <div className="flex justify-end mt-2">
          <button
            onClick={() => {
              if (!description || !amount) return toast.error("กรอกรายละเอียดและจำนวน");
              if (Number(amount) > remaining + 0.01) {
                if (!confirm("ยอดเกินคงเหลือ ต้องการบันทึกต่อ?")) return;
              }
              add.mutate();
            }}
            disabled={add.isPending}
            className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700"
          >
            + เพิ่มงวด
          </button>
        </div>
      </div>

      {/* Installments list */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="p-2">#</th>
              <th className="p-2">วันที่</th>
              <th className="p-2">รายละเอียด</th>
              <th className="p-2 text-right">จำนวน</th>
              <th className="p-2">ใบเสร็จ</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {listQ.data?.map((i, idx) => (
              <tr key={i.id} className="border-t">
                <td className="p-2">{idx + 1}</td>
                <td className="p-2">{fmtDate(i.date)}</td>
                <td className="p-2">{i.description}</td>
                <td className="p-2 text-right">{fmt(i.amount)}</td>
                <td className="p-2">{i.receiptNo ?? "-"}</td>
                <td className="p-2 text-right">
                  <button
                    onClick={() => {
                      if (confirm("ลบงวดนี้?")) del.mutate(i.id);
                    }}
                    className="text-red-600 hover:underline"
                  >
                    ลบ
                  </button>
                </td>
              </tr>
            ))}
            {listQ.data?.length === 0 && (
              <tr>
                <td colSpan={6} className="p-4 text-center text-slate-500">
                  ยังไม่มีการจ่ายงวด
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}

function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className={`bg-white rounded-lg shadow-xl w-full ${wide ? "max-w-4xl" : "max-w-md"} max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800 text-xl">
            ✕
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm text-slate-600">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
