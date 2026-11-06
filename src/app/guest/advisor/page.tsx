import { GuestAdvisor } from "@/components/guest-advisor";
export const metadata = {
  title: "Your acquisition advisor · FirstCustomers",
  robots: { index: false, follow: false },
};
export default async function GuestAdvisorPage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string }>;
}) {
  const { url } = await searchParams;
  return (
    <main className="container py-10">
      <GuestAdvisor url={typeof url === "string" ? url.slice(0, 2048) : ""} />
    </main>
  );
}
