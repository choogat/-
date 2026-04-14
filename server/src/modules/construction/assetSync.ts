import { prisma } from "../../lib/prisma.js";
import { AssetType } from "../../lib/enums.js";

const CATEGORY_NAME = "งานก่อสร้าง";

async function ensureCategory() {
  const existing = await prisma.assetCategory.findUnique({ where: { name: CATEGORY_NAME } });
  if (existing) return existing;
  return prisma.assetCategory.create({ data: { name: CATEGORY_NAME, type: AssetType.BUILDING } });
}

const codeFor = (projectId: number) => `CON-PRJ-${projectId}`;

export async function syncProjectAsset(projectId: number) {
  const project = await prisma.constructionProject.findUnique({
    where: { id: projectId },
    include: { expenses: true },
  });
  const code = codeFor(projectId);
  const existing = await prisma.asset.findUnique({ where: { code } });

  const shouldBeAsset = !!project && (project as any).isAsset;
  if (!shouldBeAsset) {
    if (existing) {
      await prisma.assetDepreciationLog.deleteMany({ where: { assetId: existing.id } });
      await prisma.asset.delete({ where: { id: existing.id } });
    }
    return;
  }

  const cat = await ensureCategory();
  const total = project!.expenses.reduce((s, e) => s + e.amount, 0);
  const acquireDate = project!.startDate ?? project!.expenses[0]?.date ?? new Date();

  if (existing) {
    await prisma.asset.update({
      where: { id: existing.id },
      data: {
        name: project!.name,
        acquireDate,
        costPrice: total,
        currentValue: total - existing.accumulatedDepreciation,
      },
    });
  } else {
    await prisma.asset.create({
      data: {
        code,
        categoryId: cat.id,
        name: project!.name,
        description: `อัตโนมัติจากโครงการก่อสร้าง #${project!.id}`,
        acquireDate,
        costPrice: total,
        currentValue: total,
      },
    });
  }
}

export async function backfillAllConstructionAssets() {
  await prisma.assetDepreciationLog.deleteMany({
    where: { asset: { code: { startsWith: "CON-EXP-" } } },
  });
  await prisma.asset.deleteMany({ where: { code: { startsWith: "CON-EXP-" } } });
  const projects = await prisma.constructionProject.findMany({ select: { id: true } });
  for (const p of projects) await syncProjectAsset(p.id);
}
