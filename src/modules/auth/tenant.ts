import { db } from "@/lib/db";
import { auth } from "./server";
import { AppError } from "@/lib/errors";
export { AppError } from "@/lib/errors";
export async function tenant() {
  const { data } = await auth().getSession();
  if (!data?.user) throw new AppError("Please sign in to continue.", 401);
  const u = data.user;
  const p = db();
  await p.user.upsert({
    where: { id: u.id },
    create: { id: u.id, email: u.email, name: u.name },
    update: { email: u.email, name: u.name },
  });
  return p.$transaction(
    async (tx) => {
      // Serialize first-workspace creation for concurrent post-signup claim requests.
      await tx.$queryRaw`SELECT id FROM "User" WHERE id=${u.id} FOR UPDATE`;
      const org = await tx.organization.upsert({
        where: { ownerId: u.id },
        create: {
          name: `${u.name || "My"} workspace`,
          slug: `workspace-${u.id}`,
          ownerId: u.id,
          memberships: { create: { userId: u.id } },
        },
        update: {},
      });
      const membership = await tx.membership.findUnique({
        where: {
          organizationId_userId: { organizationId: org.id, userId: u.id },
        },
      });
      if (!membership || membership.status !== "ACTIVE")
        throw new AppError("Workspace access is unavailable.", 403);
      return { organizationId: org.id, userId: u.id };
    },
    { maxWait: 10000, timeout: 15000 },
  );
}
export async function ownedProduct(organizationId: string, id: string) {
  const product = await db().product.findFirst({
    where: { id, organizationId },
  });
  if (!product) throw new AppError("Product not found.", 404);
  return product;
}
