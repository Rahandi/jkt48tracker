import { formatDate } from "@/lib/utils";
import { AdminKeyForm } from "./AdminKeyForm";
import { ContributionActions } from "./ContributionActions";

export const dynamic = "force-dynamic";

const STATUS_TABS = ["pending", "approved", "rejected"] as const;
type StatusTab = (typeof STATUS_TABS)[number];

interface Contribution {
  id: number;
  contribution_type: string;
  jkt48_schedule_id: string;
  theater_schedule_id: number | null;
  payload: Record<string, unknown>;
  status: string;
  contributor_name: string | null;
  contributor_contact: string | null;
  contributor_note: string | null;
  rejection_reason: string | null;
  reviewed_at: number | null;
  created_at: number;
  show_date: string | null;
  show_time: string | null;
  setlist_name: string | null;
}

async function fetchContributions(key: string, status: string) {
  if (!process.env.BACKEND_URL || !key) return { items: [], count: 0, unauthorized: !key };
  const res = await fetch(
    `${process.env.BACKEND_URL}/internal/contributions/?status=${status}&limit=100`,
    { headers: { "X-Api-Key": key }, cache: "no-store" }
  );
  if (res.status === 401) return { items: [], count: 0, unauthorized: true };
  const [items, countData] = await Promise.all([
    res.json(),
    fetch(`${process.env.BACKEND_URL}/internal/contributions/count?status=${status}`, {
      headers: { "X-Api-Key": key }, cache: "no-store",
    }).then((r) => r.json()),
  ]);
  return { items: items as Contribution[], count: countData.count as number, unauthorized: false };
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ key?: string; status?: string }>;
}) {
  const { key = "", status = "pending" } = await searchParams;

  if (!key) return <AdminKeyForm />;

  const activeTab = (STATUS_TABS.includes(status as StatusTab) ? status : "pending") as StatusTab;
  const { items, count, unauthorized } = await fetchContributions(key, activeTab);

  if (unauthorized) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-destructive font-medium">Invalid admin key</p>
          <a href="/admin" className="text-sm text-muted-foreground hover:text-foreground underline">
            Try again
          </a>
        </div>
      </div>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Contributions</h1>
        <span className="text-sm text-muted-foreground">{count} {activeTab}</span>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 mb-6 border-b border-border">
        {STATUS_TABS.map((tab) => (
          <a
            key={tab}
            href={`/admin?key=${encodeURIComponent(key)}&status=${tab}`}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${
              activeTab === tab
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </a>
        ))}
      </div>

      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">No {activeTab} contributions.</p>
      ) : (
        <div className="space-y-4">
          {items.map((c) => (
            <div key={c.id} className="rounded-lg border border-border p-4 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                      {c.contribution_type}
                    </span>
                    <span className="text-sm font-medium">
                      {c.setlist_name ?? "TBA"}{" "}
                      {c.show_date && (
                        <span className="text-muted-foreground font-normal">
                          · {formatDate(c.show_date)}
                          {c.show_time && ` ${c.show_time}`}
                        </span>
                      )}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    ID #{c.id} · jkt48_id: {c.jkt48_schedule_id} · submitted{" "}
                    {new Date(c.created_at * 1000).toLocaleString()}
                    {c.contributor_name && ` by ${c.contributor_name}`}
                  </p>
                </div>
                {c.status === "rejected" && c.rejection_reason && (
                  <span className="text-xs text-destructive shrink-0">
                    Reason: {c.rejection_reason}
                  </span>
                )}
              </div>

              {/* Payload */}
              <div className="rounded-md bg-muted px-3 py-2 text-xs overflow-x-auto">
                {c.contribution_type === "show_members" &&
                Array.isArray((c.payload as { members?: unknown[] }).members) ? (
                  <span className="font-mono">{(c.payload as { members: string[] }).members.join(", ")}</span>
                ) : c.contribution_type === "suggestion" ? (
                  <p className="whitespace-pre-wrap">{(c.payload as { text: string }).text}</p>
                ) : (
                  <pre className="whitespace-pre-wrap font-mono">{JSON.stringify(c.payload, null, 2)}</pre>
                )}
              </div>

              {c.contributor_note && (
                <p className="text-xs text-muted-foreground italic">Note: {c.contributor_note}</p>
              )}

              {c.status === "pending" && (
                <ContributionActions contributionId={c.id} adminKey={key} />
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
