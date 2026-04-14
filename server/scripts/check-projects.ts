import 'dotenv/config'
import { prisma } from '../src/lib/prisma.js'

const projects = await prisma.constructionProject.findMany({ include: { expenses: true } })
for (const p of projects) {
  const total = p.expenses.reduce((s, e) => s + e.amount, 0)
  console.log(`#${p.id} | ${p.name} | isAsset=${(p as any).isAsset} | งวด=${p.expenses.length} | รวม=${total.toLocaleString()}`)
}
const assets = await prisma.asset.findMany({ where: { code: { startsWith: 'CON-PRJ-' } } })
console.log('\nAsset records:')
for (const a of assets) console.log(`${a.code} | ${a.name} | ฿${a.costPrice.toLocaleString()}`)
await prisma.$disconnect()
