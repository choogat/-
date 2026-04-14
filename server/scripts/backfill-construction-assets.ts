import 'dotenv/config'
import { backfillAllConstructionAssets } from '../src/modules/construction/assetSync.js'
import { prisma } from '../src/lib/prisma.js'

await backfillAllConstructionAssets()
const count = await prisma.asset.count({ where: { code: { startsWith: 'CON-EXP-' } } })
console.log(`Backfill done. Construction-linked assets: ${count}`)
await prisma.$disconnect()
