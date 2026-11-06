import { redirect } from "next/navigation";
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ url?: string }>;
}) {
  const { url } = await searchParams;
  redirect(
    `/advisor${typeof url === "string" ? `?url=${encodeURIComponent(url.slice(0, 2048))}` : ""}`,
  );
}
