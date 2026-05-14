import { cookies } from "next/headers";

export async function POST(req: Request) {
  const { key } = await req.json();
  if (!key) return Response.json({ detail: "Missing key" }, { status: 401 });

  const validate = await fetch(
    `${process.env.BACKEND_URL}/internal/contributions/count?status=pending`,
    { headers: { "X-Api-Key": key }, cache: "no-store" }
  );
  if (validate.status === 401) return Response.json({ detail: "Invalid key" }, { status: 401 });
  if (!validate.ok) return Response.json({ detail: "Validation failed" }, { status: 502 });

  const cookieStore = await cookies();
  cookieStore.set("admin_key", key, {
    httpOnly: true,
    sameSite: "strict",
    path: "/",
  });
  return Response.json({ ok: true });
}
