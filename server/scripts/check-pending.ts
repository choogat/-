import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const today = new Date()

async function main() {
  const pending = await prisma.invoice.findMany({
    where: { status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] } },
    include: { contract: { include: { tenant: true, lock: true } } },
    orderBy: { dueDate: 'asc' },
  })

  let updatedOverdue = 0
  for (const inv of pending) {
    if (inv.status !== 'OVERDUE' && inv.dueDate < today && inv.paidAmount < inv.amount) {
      await prisma.invoice.update({ where: { id: inv.id }, data: { status: 'OVERDUE' } })
      updatedOverdue++
    }
  }

  const summary = await prisma.invoice.groupBy({
    by: ['status'],
    _count: { _all: true },
    _sum: { amount: true, paidAmount: true },
  })

  console.log(`\n=== สรุปบิลค้างชำระ (วันนี้ ${today.toISOString().slice(0,10)}) ===`)
  console.log(`อัปเดตเป็น OVERDUE เพิ่ม: ${updatedOverdue} ใบ\n`)
  for (const s of summary) {
    console.log(`${s.status.padEnd(10)} | ${String(s._count._all).padStart(4)} ใบ | ยอด ${(s._sum.amount ?? 0).toLocaleString()} | ชำระแล้ว ${(s._sum.paidAmount ?? 0).toLocaleString()}`)
  }

  const unpaid = await prisma.invoice.findMany({
    where: { status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] } },
    include: { contract: { include: { tenant: true, lock: true } } },
    orderBy: { dueDate: 'asc' },
  })
  console.log(`\n=== รายการค้างชำระ (${unpaid.length} ใบ) ===`)
  for (const inv of unpaid) {
    const t = inv.contract?.tenant?.fullName ?? '-'
    const l = inv.contract?.lock?.code ?? '-'
    const remain = inv.amount - inv.paidAmount
    console.log(`${inv.invoiceNo} | ${inv.type.padEnd(8)} | ล็อค ${l} | ${t} | งวด ${inv.period} | ครบกำหนด ${inv.dueDate.toISOString().slice(0,10)} | ค้าง ${remain.toLocaleString()} | ${inv.status}`)
  }

  const activeContractsNoInvThisMonth = await prisma.lockContract.findMany({
    where: { status: 'ACTIVE' },
    include: { tenant: true, lock: true, invoices: true },
  })
  const period = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}`
  const missing = activeContractsNoInvThisMonth.filter(c => !c.invoices.some(i => i.period === period && i.type === 'RENT'))
  if (missing.length) {
    console.log(`\n=== สัญญา ACTIVE ที่ยังไม่ออกบิลค่าเช่างวด ${period} (${missing.length}) ===`)
    for (const c of missing) {
      console.log(`ล็อค ${c.lock.code} | ${c.tenant.fullName} | ค่าเช่า ${c.rentAmount.toLocaleString()}`)
    }
  }
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
