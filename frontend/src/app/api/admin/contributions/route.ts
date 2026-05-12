export async function GET(req: Request) {
  const url = new URL(req.url);
  const key = url.searchParams.get("key") ?? "";
  const status = url.searchParams.get("status") ?? "pending";
  const limit = url.searchParams.get("limit") ?? "50";
  const offset = url.searchParams.get("offset") ?? "0";

  const [listRes, countRes] = await Promise.all([
    fetch(
      `${process.env.BACKEND_URL}/internal/contributions/?status=${status}&limit=${limit}&offset=${offset}`,
      { headers: { "X-Api-Key": key } }
    ),
    fetch(`${process.env.BACKEND_URL}/internal/contributions/count?status=${status}`, {
      headers: { "X-Api-Key": key },
    }),
  ]);

  if (listRes.status === 401) return Response.json({ detail: "Unauthorized" }, { status: 401 });

  const [items, countData] = await Promise.all([listRes.json(), countRes.json()]);
  return Response.json({ items, count: countData.count });
}
