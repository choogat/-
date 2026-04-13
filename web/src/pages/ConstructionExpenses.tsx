import LedgerPage from "../components/LedgerPage";

export default function ConstructionExpenses() {
  return (
    <LedgerPage
      title="ค่าใช้จ่ายก่อสร้าง"
      ledgerType="CONSTRUCTION"
      hideIncome
      expenseLabel="เพิ่มรายจ่าย"
      showPartyFilter
      showPartyColumn
      partyLabel="ผู้รับเงิน"
      defaultAllMonths
    />
  );
}
