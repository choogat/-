import 'dotenv/config'
import { prisma } from '../src/lib/prisma.js'
import { syncProjectAsset } from '../src/modules/construction/assetSync.js'

const id = 5
await prisma.constructionProject.update({ where: { id }, data: { isAsset: true } as any })
await syncProjectAsset(id)
const a = await prisma.asset.findMany({ where: { code: { startsWith: 'CON-PRJ-' } } })
for (const x of a) console.log(x.code, x.name, '฿' + x.costPrice.toLocaleString())
await prisma.$disconnect()
