import { cookies } from "next/headers";

export async function POST(req: Request) {
  const { contributionId, action, reason } = await req.json();
  const cookieStore = await cookies();
  const key = cookieStore.get("admin_key")?.value;
  if (!key) return Response.json({ detail: "Not authenticated" }, { status: 401 });

  const path = action === "approve" ? "approve" : "reject";
  const res = await fetch(
    `${process.env.BACKEND_URL}/internal/contributions/${contributionId}/${path}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": key,
      },
      body: JSON.stringify({ reason: reason ?? null }),
    }
  );
  const data = await res.json();
  return Response.json(data, { status: res.status });
}
