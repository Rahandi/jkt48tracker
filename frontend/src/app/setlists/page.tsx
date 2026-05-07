import Link from "next/link";
import { formatDate } from "@/lib/utils";

type Setlist = {
  setlist_name: string;
  count: number;
  first_date: string | null;
  last_date: string | null;
};

async function getSetlists(): Promise<Setlist[]> {
  const res = await fetch(
    `${process.env.BACKEND_URL}/api/theater-schedules/stats/setlists`,
    { next: { revalidate: 3600 } }
  );
  if (!res.ok) return [];
  return res.json();
}

export default async function SetlistsPage() {
  const setlists = await getSetlists();
  const maxCount = setlists[0]?.count ?? 1;

  return (
    <div className="min-h-screen">
      <main className="px-4 py-6 sm:px-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Setlists</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {setlists.length} unique setlists · {setlists.reduce((s, l) => s + l.count, 0).toLocaleString()} total shows
            </p>
          </div>
        </div>

        <div className="border border-border rounded-xl overflow-hidden">
          {setlists.map((s, i) => {
            const firstYear = s.first_date ? s.first_date.slice(0, 4) : null;
            const lastYear = s.last_date ? s.last_date.slice(0, 4) : null;
            const yearRange = firstYear === lastYear ? firstYear : firstYear && lastYear ? `${firstYear}–${lastYear}` : firstYear;

            return (
              <Link
                key={s.setlist_name}
                href={`/setlists/${encodeURIComponent(s.setlist_name)}`}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/50 transition-colors border-b border-border last:border-0 group"
              >
                <span className="text-muted-foreground text-xs w-5 text-right shrink-0 tabular-nums">
                  {i + 1}
                </span>

                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <div
                    className="h-1 rounded-full bg-primary shrink-0"
                    style={{ width: `${Math.max(4, (s.count / maxCount) * 48)}px` }}
                  />
                  <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                    {s.setlist_name}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {yearRange && (
                    <span className="text-[11px] text-muted-foreground hidden sm:block">{yearRange}</span>
                  )}
                  <span className="text-xs font-semibold text-primary tabular-nums w-10 text-right">
                    {s.count}×
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
