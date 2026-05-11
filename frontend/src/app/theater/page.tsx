import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Pagination } from "@/components/ui/Pagination";
import { TheaterTabs } from "@/components/theater/TheaterTabs";
import { TopSetlistsChart } from "@/components/charts/TopSetlistsChart";
import { formatDate } from "@/lib/utils";
import { getTeamColor, TEAM_COLORS } from "@/lib/teamColors";

const PER_PAGE = 30;

const TEAM_FILTERS = [
  { key: "", label: "All" },
  { key: "love", label: "Team Love" },
  { key: "dream", label: "Team Dream" },
  { key: "passion", label: "Team Passion" },
];

type ScheduleMember = { id: number; name: string; jkt48_id: string | null };

type TheaterSchedule = {
  id: number;
  show_date: string | null;
  show_time: string | null;
  setlist_name: string | null;
  member_count: number;
  members: ScheduleMember[];
};

type Member = {
  id: number;
  jkt48_id: string;
  name: string;
  image_url: string | null;
  team: string | null;
};

async function getSchedules(opts: {
  upcoming?: boolean;
  past?: boolean;
  limit?: number;
  offset?: number;
  team?: string;
}): Promise<TheaterSchedule[]> {
  const params = new URLSearchParams();
  if (opts.upcoming) params.set("upcoming", "true");
  if (opts.past) params.set("past", "true");
  if (opts.limit != null) params.set("limit", String(opts.limit));
  if (opts.offset) params.set("offset", String(opts.offset));
  if (opts.team) params.set("team", opts.team);
  if (!process.env.BACKEND_URL) return [];
  const res = await fetch(
    `${process.env.BACKEND_URL}/api/theater-schedules/?${params}`,
    { cache: "no-store" }
  );
  if (!res.ok) return [];
  return res.json();
}

async function getScheduleCount(opts: { upcoming?: boolean; past?: boolean; team?: string }): Promise<number> {
  if (!process.env.BACKEND_URL) return 0;
  const params = new URLSearchParams();
  if (opts.upcoming) params.set("upcoming", "true");
  if (opts.past) params.set("past", "true");
  if (opts.team) params.set("team", opts.team);
  const res = await fetch(
    `${process.env.BACKEND_URL}/api/theater-schedules/count?${params}`,
    { next: { revalidate: 3600 } }
  );
  if (!res.ok) return 0;
  const data = await res.json();
  return data.count;
}

async function getMembers(): Promise<Member[]> {
  if (!process.env.BACKEND_URL) return [];
  const res = await fetch(`${process.env.BACKEND_URL}/api/members/`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) return [];
  return res.json();
}

async function getTopSetlists(): Promise<{ setlist_name: string; count: number }[]> {
  if (!process.env.BACKEND_URL) return [];
  const res = await fetch(
    `${process.env.BACKEND_URL}/api/theater-schedules/stats/top-setlists`,
    { next: { revalidate: 3600 } }
  );
  if (!res.ok) return [];
  return res.json();
}

function deriveTeam(members: ScheduleMember[], memberMap: Map<string, Member>): string | null {
  const counts: Record<string, number> = {};
  for (const m of members) {
    if (m.jkt48_id) {
      const info = memberMap.get(m.jkt48_id);
      if (info?.team) counts[info.team] = (counts[info.team] ?? 0) + 1;
    }
  }
  const sorted = Object.entries(counts).sort(([, a], [, b]) => b - a);
  return sorted[0]?.[0] ?? null;
}

function ShowRow({
  s,
  memberMap,
}: {
  s: TheaterSchedule;
  memberMap: Map<string, Member>;
}) {
  const team = deriveTeam(s.members, memberMap);
  const teamColor = getTeamColor(team);

  return (
    <Link href={`/theater/${s.id}`}>
      <Card className="hover:ring-2 hover:ring-primary/60 transition-all duration-200 cursor-pointer overflow-hidden">
        <div className="h-0.5 w-full" style={{ backgroundColor: teamColor ? teamColor.hex : "var(--border)" }} />
        <CardContent className="py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                {teamColor && (
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0"
                    style={{ backgroundColor: teamColor.bg, color: teamColor.text }}
                  >
                    {team === "JKT48_VIRTUAL" ? "Virtual" : team?.charAt(0) + team!.slice(1).toLowerCase()}
                  </span>
                )}
                <h3 className="font-semibold text-foreground text-base leading-tight truncate">
                  {s.setlist_name ?? "TBA"}
                </h3>
              </div>
              <p className="text-muted-foreground text-sm mt-1">
                {s.show_date ? formatDate(s.show_date) : "Date TBA"}
                {s.show_time && <span className="ml-2">· {s.show_time} WIB</span>}
              </p>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground bg-secondary rounded-full px-2.5 py-1">
              {s.member_count} members
            </span>
          </div>

          {s.members.length > 0 && (
            <div className="flex items-center mt-3 gap-2">
              <div className="flex -space-x-2">
                {s.members.slice(0, 8).map((m, i) => {
                  const info = m.jkt48_id ? memberMap.get(m.jkt48_id) : undefined;
                  return info?.image_url ? (
                    <Image
                      key={i}
                      src={info.image_url}
                      alt={m.name}
                      width={28}
                      height={28}
                      className="w-7 h-7 rounded-full object-cover ring-2 ring-card"
                    />
                  ) : (
                    <div
                      key={i}
                      className="w-7 h-7 rounded-full bg-muted ring-2 ring-card flex items-center justify-center"
                    >
                      <span className="text-[9px] text-muted-foreground font-semibold">
                        {m.name[0]}
                      </span>
                    </div>
                  );
                })}
              </div>
              {s.member_count > 8 && (
                <span className="text-xs text-muted-foreground">
                  +{s.member_count - 8} more
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

export default async function TheaterPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; page?: string; team?: string }>;
}) {
  const { tab = "upcoming", page: pageStr = "1", team = "" } = await searchParams;
  const isPast = tab === "past";
  const page = Math.max(1, parseInt(pageStr) || 1);
  const offset = (page - 1) * PER_PAGE;
  const teamParam = team || undefined;

  const [schedules, total, upcomingCount, pastCount, members, topSetlists] = await Promise.all([
    isPast
      ? getSchedules({ past: true, limit: PER_PAGE, offset, team: teamParam })
      : getSchedules({ upcoming: true, team: teamParam }),
    isPast
      ? getScheduleCount({ past: true, team: teamParam })
      : getScheduleCount({ upcoming: true, team: teamParam }),
    getScheduleCount({ upcoming: true }),
    getScheduleCount({ past: true }),
    getMembers(),
    getTopSetlists(),
  ]);

  const memberMap = new Map(members.map((m) => [m.jkt48_id, m]));
  const baseHref = `/theater?tab=${tab}`;

  return (
    <div className="min-h-screen">
      <main className="px-4 py-6 sm:px-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">Theater Schedule</h1>
          <span className="text-sm text-muted-foreground">{total.toLocaleString()} shows</span>
        </div>

        <TheaterTabs activeTab={tab} upcomingCount={upcomingCount} pastCount={pastCount} />

        {/* Team filter */}
        <div className="flex gap-2 flex-wrap mb-6">
          {TEAM_FILTERS.map((t) => {
            const active = team === t.key;
            const color = t.key ? TEAM_COLORS[t.key.toUpperCase()] : null;
            const href = t.key ? `${baseHref}&team=${t.key}` : `/theater?tab=${tab}`;
            return (
              <Link
                key={t.key}
                href={href}
                style={
                  active && color
                    ? { backgroundColor: color.bg, color: color.text, borderColor: color.hex + "60" }
                    : undefined
                }
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                  active
                    ? color
                      ? "border"
                      : "bg-primary text-primary-foreground border-transparent"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/70 border-transparent"
                }`}
              >
                {t.label}
              </Link>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-[1fr_300px] gap-6">
          <section>
            {schedules.length === 0 ? (
              <p className="text-muted-foreground text-sm">No shows.</p>
            ) : isPast ? (
              (() => {
                const byYear = schedules.reduce<Record<string, TheaterSchedule[]>>((acc, s) => {
                  const y = s.show_date ? s.show_date.slice(0, 4) : "Unknown";
                  (acc[y] ??= []).push(s);
                  return acc;
                }, {});
                return (
                  <div className="flex flex-col gap-6">
                    {Object.entries(byYear)
                      .sort(([a], [b]) => Number(b) - Number(a))
                      .map(([year, shows]) => (
                        <div key={year}>
                          <div className="flex items-center gap-3 mb-3">
                            <span className="text-xs font-bold text-primary uppercase tracking-widest">
                              {year}
                            </span>
                            <span className="flex-1 h-px bg-border" />
                            <span className="text-xs text-muted-foreground">{shows.length} shows</span>
                          </div>
                          <div className="flex flex-col gap-3">
                            {shows.map((s) => (
                              <ShowRow key={s.id} s={s} memberMap={memberMap} />
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
                );
              })()
            ) : (
              <div className="flex flex-col gap-3">
                {schedules.map((s) => (
                  <ShowRow key={s.id} s={s} memberMap={memberMap} />
                ))}
              </div>
            )}

            {isPast && (
              <Pagination
                page={page}
                total={total}
                perPage={PER_PAGE}
                basePath="/theater"
                extraParams={`tab=past${team ? `&team=${team}` : ""}`}
              />
            )}
          </section>

          <aside className="flex flex-col gap-6">
            {topSetlists.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Top Setlists (All-time)
                </h2>
                <Card>
                  <CardContent className="py-4 px-4">
                    <TopSetlistsChart data={topSetlists} />
                  </CardContent>
                </Card>
              </div>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}
