import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { SuggestionBox } from "@/components/SuggestionBox";

export const dynamic = "force-dynamic";

type Show = {
  id: number;
  jkt48_schedule_id: string;
  show_date: string | null;
  show_time: string | null;
  setlist_name: string | null;
  member_count: number;
};

async function getMissingMemberShows(): Promise<{ shows: Show[]; total: number }> {
  if (!process.env.BACKEND_URL) return { shows: [], total: 0 };
  const [listRes, countRes] = await Promise.all([
    fetch(
      `${process.env.BACKEND_URL}/api/theater-schedules/?past=true&no_members=true&limit=200`,
      { cache: "no-store" }
    ),
    fetch(
      `${process.env.BACKEND_URL}/api/theater-schedules/count?past=true&no_members=true`,
      { cache: "no-store" }
    ),
  ]);
  if (!listRes.ok) return { shows: [], total: 0 };
  const [shows, countData] = await Promise.all([listRes.json(), countRes.json()]);
  return { shows: shows as Show[], total: countData.count as number };
}

export default async function ContributePage() {
  const { shows, total } = await getMissingMemberShows();

  return (
    <div className="min-h-screen">
      <main className="max-w-4xl mx-auto px-4 py-10 sm:px-6">

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-foreground">Help Complete the Data</h1>
          <p className="mt-2 text-muted-foreground text-base max-w-2xl">
            JKT48 Tracker relies on community contributions to fill gaps in historical data.
            Below is what still needs your help. Every show you complete makes this tracker better for everyone.
          </p>
        </div>

        {/* General suggestions */}
        <section className="mb-12">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-2">
            Got a suggestion?
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Feature requests, missing data, site feedback — anything. We read every message.
          </p>
          <SuggestionBox />
        </section>

        <hr className="border-border mb-10" />

        {/* Category: Missing member lists */}
        <section>
          <div className="flex items-baseline gap-3 mb-4">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              Theater Shows — Missing Member List
            </h2>
            <span className="text-sm text-muted-foreground">{total} shows</span>
          </div>

          <p className="text-sm text-muted-foreground mb-6">
            These past shows have no performing member data. If you remember who performed,
            open the show page and submit the member list. Names are matched to member profiles automatically.
          </p>

          {shows.length === 0 ? (
            <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-6 py-8 text-center">
              <p className="text-green-700 dark:text-green-400 font-medium">
                All shows have member data — thank you, contributors!
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {shows.map((show) => (
                <Link
                  key={show.id}
                  href={`/theater/${show.id}`}
                  className="group flex items-center justify-between gap-4 px-4 py-3 rounded-xl bg-card ring-1 ring-border hover:ring-primary/60 transition-all duration-200"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {show.setlist_name ?? "Setlist TBA"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {show.show_date ? formatDate(show.show_date) : "Date TBA"}
                      {show.show_time && ` · ${show.show_time} WIB`}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-primary font-medium group-hover:underline underline-offset-2">
                    Add members →
                  </span>
                </Link>
              ))}
              {total > shows.length && (
                <p className="text-center text-xs text-muted-foreground pt-2">
                  Showing {shows.length} of {total} shows
                </p>
              )}
            </div>
          )}
        </section>

      </main>
    </div>
  );
}
