import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import LedgerPage from "../components/LedgerPage";
import { api } from "../lib/api";

type ConstructionInstallment = {
  id: number;
  projectName: string;
  contractor: string | null;
  date: string;
  description: string;
  amount: number;
  receiptNo: string | null;
};

const SETTING_KEY = "INVESTMENT_CATEGORIES";
const DEFAULT_CATEGORIES = ["เงินสด", "โครงสร้าง", "สิ่งของ", "ของใช้", "อื่นๆ"];

export default function InvestmentExpenses() {
  const qc = useQueryClient();
  const [showManage, setShowManage] = useState(false);

  const { data: installments = [] } = useQuery<ConstructionInstallment[]>({
    queryKey: ["construction-installments-all"],
    queryFn: async () => (await api.get("/construction/installments")).data,
  });

  const { data: settings = {} } = useQuery<Record<string, string>>({
    queryKey: ["settings"],
    queryFn: async () => (await api.get("/settings")).data,
  });

  const categoryOptions = useMemo(() => {
    const raw = settings[SETTING_KEY];
    if (!raw) return DEFAULT_CATEGORIES;
    try {
      const arr = JSON.parse(raw);
      return Array.isArray(arr) && arr.length ? arr : DEFAULT_CATEGORIES;
    } catch {
      return DEFAULT_CATEGORIES;
    }
  }, [settings]);

  const saveMut = useMutation({
    mutationFn: async (list: string[]) =>
      api.patch("/settings", { [SETTING_KEY]: JSON.stringify(list) }),
    onSuccess: () => {
      toast.success("บันทึกแล้ว");
      qc.invalidateQueries({ queryKey: ["settings"] });
      setShowManage(false);
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? "บันทึกไม่สำเร็จ"),
  });

  const extraRows = installments.map((i) => {
    const d = dayjs(i.date);
    return {
      period: d.format("YYYY-MM"),
      date: d.format("YYYY-MM-DD"),
      party: i.contractor ?? "",
      category: "ก่อสร้าง",
      detail: `${i.projectName} — ${i.description}${i.receiptNo ? ` #${i.receiptNo}` : ""}`,
      income: 0,
      expense: i.amount,
    };
  });

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button className="px-3 py-1.5 text-sm border rounded hover:bg-slate-50"
          onClick={() => setShowManage(true)}>
          จัดการประเภท
        </button>
      </div>
      <LedgerPage
        title="ค่าใช้จ่ายในการลงทุน"
        ledgerType="INVESTMENT"
        hideIncome
        expenseLabel="ยอดลงทุน"
        categoryOptions={categoryOptions}
        categoryLabel="ประเภท"
        showPartyFilter
        partyLabel="ผู้รับเงิน"
        defaultAllMonths
        showPartyColumn
        extraRows={extraRows}
      />
      {showManage && (
        <ManageCategoriesModal
          initial={categoryOptions}
          onClose={() => setShowManage(false)}
          onSave={(list) => saveMut.mutate(list)}
          saving={saveMut.isPending}
        />
      )}
    </div>
  );
}

function ManageCategoriesModal({
  initial, onClose, onSave, saving,
}: {
  initial: string[];
  onClose: () => void;
  onSave: (list: string[]) => void;
  saving: boolean;
}) {
  const [list, setList] = useState<string[]>(initial);
  const [newName, setNewName] = useState("");

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-3">จัดการประเภท</h2>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {list.map((name, idx) => (
            <div key={idx} className="flex gap-2">
              <input className="border rounded p-2 flex-1" value={name}
                onChange={(e) => setList(list.map((v, i) => (i === idx ? e.target.value : v)))} />
              <button className="px-2 text-rose-600 hover:underline"
                onClick={() => setList(list.filter((_, i) => i !== idx))}>
                ลบ
              </button>
            </div>
          ))}
          {list.length === 0 && <div className="text-slate-400 text-sm">ยังไม่มีประเภท</div>}
        </div>
        <div className="flex gap-2 mt-3">
          <input className="border rounded p-2 flex-1" placeholder="เพิ่มประเภทใหม่"
            value={newName} onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newName.trim()) {
                setList([...list, newName.trim()]);
                setNewName("");
              }
            }} />
          <button className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={() => {
              if (!newName.trim()) return;
              setList([...list, newName.trim()]);
              setNewName("");
            }}>
            + เพิ่ม
          </button>
        </div>
        <div className="flex gap-2 justify-end mt-4">
          <button className="px-4 py-2 rounded border" onClick={onClose}>ยกเลิก</button>
          <button disabled={saving}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            onClick={() => {
              const cleaned = list.map((s) => s.trim()).filter(Boolean);
              onSave(cleaned);
            }}>
            บันทึก
          </button>
        </div>
      </div>
    </div>
  );
}
