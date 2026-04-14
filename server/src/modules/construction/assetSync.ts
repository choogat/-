import { prisma } from "../../lib/prisma.js";
import { AssetType } from "../../lib/enums.js";

const CATEGORY_NAME = "งานก่อสร้าง";

async function ensureCategory() {
  const existing = await prisma.assetCategory.findUnique({ where: { name: CATEGORY_NAME } });
  if (existing) return existing;
  return prisma.assetCategory.create({ data: { name: CATEGORY_NAME, type: AssetType.BUILDING } });
}

const codeFor = (expenseId: number) => `CON-EXP-${expenseId}`;

export async function syncConstructionAsset(expenseId: number) {
  const exp = await prisma.constructionExpense.findUnique({
    where: { id: expenseId },
    include: { project: true },
  });
  if (!exp) {
    await prisma.asset.deleteMany({ where: { code: codeFor(expenseId) } });
    return;
  }
  const shouldBeAsset = (exp as any).isAsset || (exp.project as any).isAsset;
  const code = codeFor(expenseId);
  const existing = await prisma.asset.findUnique({ where: { code } });

  if (!shouldBeAsset) {
    if (existing) {
      await prisma.assetDepreciationLog.deleteMany({ where: { assetId: existing.id } });
      await prisma.asset.delete({ where: { id: existing.id } });
    }
    return;
  }

  const cat = await ensureCategory();
  const name = `${exp.project.name}${exp.description ? ` - ${exp.description}` : ""}`;
  if (existing) {
    await prisma.asset.update({
      where: { id: existing.id },
      data: {
        name,
        acquireDate: exp.date,
        costPrice: exp.amount,
        currentValue: exp.amount - existing.accumulatedDepreciation,
      },
    });
  } else {
    await prisma.asset.create({
      data: {
        code,
        categoryId: cat.id,
        name,
        description: `อัตโนมัติจากค่าก่อสร้าง #${exp.id}`,
        acquireDate: exp.date,
        costPrice: exp.amount,
        currentValue: exp.amount,
      },
    });
  }
}

export async function syncProjectAssets(projectId: number) {
  const expenses = await prisma.constructionExpense.findMany({ where: { projectId } });
  for (const e of expenses) await syncConstructionAsset(e.id);
}

export async function backfillAllConstructionAssets() {
  const expenses = await prisma.constructionExpense.findMany();
  for (const e of expenses) await syncConstructionAsset(e.id);
}
