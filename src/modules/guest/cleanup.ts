import { db } from "@/lib/db";
export async function cleanupGuests(limit = 100) {
  const now = new Date();
  return db().$transaction(
    async (tx) => {
      const expired = await tx.guestAnalysisSession.findMany({
        where: { expiresAt: { lte: now }, claimedAt: null },
        select: { id: true },
        take: Math.min(limit, 100),
        orderBy: { expiresAt: "asc" },
      });
      const ids = expired.map((s) => s.id);
      await tx.websiteSource.deleteMany({
        where: {
          productId: null,
          analysis: { guestSessionId: { in: ids }, productId: null },
        },
      });
      await tx.analysisRun.deleteMany({
        where: { guestSessionId: { in: ids }, productId: null },
      });
      const deleted = await tx.guestAnalysisSession.deleteMany({
        where: { id: { in: ids }, claimedAt: null, expiresAt: { lte: now } },
      });
      const buckets = await tx.usageBucket.findMany({
        where: { expiresAt: { lte: now } },
        select: { key: true },
        take: 100,
      });
      await tx.usageBucket.deleteMany({
        where: { key: { in: buckets.map((b) => b.key) } },
      });
      return deleted.count;
    },
    { maxWait: 10000, timeout: 15000 },
  );
}
