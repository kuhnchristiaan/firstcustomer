import { auth } from "@/modules/auth/server";
import { redirect } from "next/navigation";
import { ClaimGuest } from "@/components/claim-guest";
export const dynamic = "force-dynamic";
export default async function ClaimPage() {
  const { data } = await auth().getSession();
  if (!data?.user) redirect("/auth/sign-up?save=guest");
  return (
    <main className="container py-16">
      <ClaimGuest />
    </main>
  );
}
