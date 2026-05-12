export async function POST(req: Request) {
  const { contributionId, action, reason, key } = await req.json();
  if (!key) return Response.json({ detail: "Missing key" }, { status: 401 });

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
