import Link from "next/link";
import { notFound } from "next/navigation";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { getTeamColor, TEAM_COLORS } from "@/lib/teamColors";

const TEAM_LABEL: Record<string, string> = {
  LOVE: "Team Love",
  DREAM: "Team Dream",
  PASSION: "Team Passion",
  TRAINEE: "Trainee",
  JKT48_VIRTUAL: "Virtual",
};

const PER_PAGE = 50;

type ScheduleMember = { id: number; name: string; jkt48_id: string | null };

type Show = {
  id: number;
  show_date: string | null;
  show_time: string | null;
  setlist_name: string | null;
  member_count: number;
  members: ScheduleMember[];
  seitansai_members: string | null;
};

type Member = {
  id: number;
  jkt48_id: string;
  name: string;
  image_url: string | null;
  team: string | null;
};

type Setlist = {
  setlist_name: string;
  count: number;
  first_date: string | null;
  last_date: string | null;
};

async function getSetlistInfo(name: string): Promise<Setlist | null> {
  const res = await fetch(
    `${process.env.BACKEND_URL}/api/theater-schedules/stats/setlists`,
    { next: { revalidate: 3600 } }
  );
  if (!res.ok) return null;
  const all: Setlist[] = await res.json();
  return all.find((s) => s.setlist_name === name) ?? null;
}

async function getShows(name: string, offset = 0): Promise<Show[]> {
  const params = new URLSearchParams({
    setlist_name: name,
    past: "true",
    limit: String(PER_PAGE),
    offset: String(offset),
  });
  const res = await fetch(
    `${process.env.BACKEND_URL}/api/theater-schedules/?${params}`,
    { next: { revalidate: 3600 } }
  );
  if (!res.ok) return [];
  return res.json();
}

async function getUpcomingShows(name: string): Promise<Show[]> {
  const params = new URLSearchParams({ setlist_name: name, upcoming: "true" });
  const res = await fetch(
    `${process.env.BACKEND_URL}/api/theater-schedules/?${params}`,
    { next: { revalidate: 3600 } }
  );
  if (!res.ok) return [];
  return res.json();
}

async function getMembers(): Promise<Member[]> {
  const res = await fetch(`${process.env.BACKEND_URL}/api/members/`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) return [];
  return res.json();
}

function deriveTeamCounts(shows: Show[], memberMap: Map<string, Member>) {
  const counts: Record<string, number> = {};
  for (const show of shows) {
    for (const m of show.members) {
      if (m.jkt48_id) {
        const info = memberMap.get(m.jkt48_id);
        if (info?.team) counts[info.team] = (counts[info.team] ?? 0) + 1;
      }
    }
  }
  return Object.entries(counts).sort(([, a], [, b]) => b - a);
}

export default async function SetlistDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ name: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { name: encodedName } = await params;
  const { page: pageStr = "1" } = await searchParams;
  const name = decodeURIComponent(encodedName);
  const page = Math.max(1, parseInt(pageStr) || 1);
  const offset = (page - 1) * PER_PAGE;

  const [info, shows, upcomingShows, members] = await Promise.all([
    getSetlistInfo(name),
    getShows(name, offset),
    getUpcomingShows(name),
    getMembers(),
  ]);

  if (!info) notFound();

  const memberMap = new Map(members.map((m) => [m.jkt48_id, m]));
  const teamEntries = deriveTeamCounts(shows, memberMap);
  const totalPages = Math.ceil(info.count / PER_PAGE);

  // group past shows by year
  const byYear = shows.reduce<Record<string, Show[]>>((acc, s) => {
    const y = s.show_date ? s.show_date.slice(0, 4) : "Unknown";
    (acc[y] ??= []).push(s);
    return acc;
  }, {});

  return (
    <div className="min-h-screen">
      <main className="px-4 py-8 sm:px-6 max-w-5xl mx-auto">
        <Link
          href="/setlists"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          ← Setlists
        </Link>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 mb-8">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold text-foreground leading-tight">{name}</h1>
            <p className="text-muted-foreground mt-2 text-sm">
              {info.first_date ? formatDate(info.first_date) : "—"}
              {info.last_date && info.last_date !== info.first_date && (
                <> → {formatDate(info.last_date)}</>
              )}
            </p>
          </div>
          <div className="flex gap-6 shrink-0">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">{info.count}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Total shows</p>
            </div>
          </div>
        </div>

        {/* Team breakdown */}
        {teamEntries.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Performed by
            </h2>
            <Card>
              <CardContent className="py-4 px-4">
                <div className="flex flex-wrap gap-2">
                  {teamEntries.map(([team, count]) => {
                    const color = getTeamColor(team);
                    return (
                      <span
                        key={team}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                        style={
                          color
                            ? { backgroundColor: color.bg, color: color.text }
                            : { backgroundColor: "var(--secondary)", color: "var(--secondary-foreground)" }
                        }
                      >
                        {TEAM_LABEL[team] ?? team}
                        <span className="opacity-70">{count}</span>
                      </span>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Upcoming shows */}
        {upcomingShows.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Upcoming
            </h2>
            <div className="flex flex-col gap-2">
              {upcomingShows.map((s) => (
                <ShowRow key={s.id} s={s} memberMap={memberMap} />
              ))}
            </div>
          </div>
        )}

        {/* Past shows grouped by year */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              All Performances
            </h2>
            <span className="text-xs text-muted-foreground">
              {offset + 1}–{Math.min(offset + PER_PAGE, info.count)} of {info.count}
            </span>
          </div>

          <div className="flex flex-col gap-6">
            {Object.entries(byYear)
              .sort(([a], [b]) => Number(b) - Number(a))
              .map(([year, yearShows]) => (
                <div key={year}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs font-bold text-primary uppercase tracking-widest">
                      {year}
                    </span>
                    <span className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground">{yearShows.length} shows</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {yearShows.map((s) => (
                      <ShowRow key={s.id} s={s} memberMap={memberMap} />
                    ))}
                  </div>
                </div>
              ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              {page > 1 && (
                <Link
                  href={`/setlists/${encodedName}?page=${page - 1}`}
                  className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm hover:bg-secondary/70 transition-colors"
                >
                  ← Prev
                </Link>
              )}
              <span className="text-sm text-muted-foreground px-3">
                Page {page} of {totalPages}
              </span>
              {page < totalPages && (
                <Link
                  href={`/setlists/${encodedName}?page=${page + 1}`}
                  className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm hover:bg-secondary/70 transition-colors"
                >
                  Next →
                </Link>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function ShowRow({ s, memberMap }: { s: Show; memberMap: Map<string, Member> }) {
  return (
    <Link
      href={`/theater/${s.id}`}
      className="flex items-center gap-4 px-4 py-3 rounded-xl bg-card ring-1 ring-border hover:ring-primary/60 transition-all duration-200"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm text-foreground font-medium">
            {s.show_date ? formatDate(s.show_date) : "Date TBA"}
            {s.show_time && (
              <span className="text-muted-foreground ml-2">· {s.show_time} WIB</span>
            )}
          </p>
          {s.seitansai_members && (
            <span className="text-xs">🎂 {s.seitansai_members}</span>
          )}
        </div>
        {s.members.length > 0 && (
          <div className="flex -space-x-1.5 mt-2">
            {s.members.slice(0, 12).map((m, i) => {
              const info = m.jkt48_id ? memberMap.get(m.jkt48_id) : undefined;
              return info?.image_url ? (
                <Image
                  key={i}
                  src={info.image_url}
                  alt={m.name}
                  width={22}
                  height={22}
                  className="w-5 h-5 rounded-full object-cover ring-1 ring-card"
                />
              ) : (
                <div
                  key={i}
                  className="w-5 h-5 rounded-full bg-muted ring-1 ring-card flex items-center justify-center shrink-0"
                >
                  <span className="text-[7px] text-muted-foreground">{m.name[0]}</span>
                </div>
              );
            })}
            {s.member_count > 12 && (
              <span className="text-[10px] text-muted-foreground ml-2 self-center">
                +{s.member_count - 12}
              </span>
            )}
          </div>
        )}
      </div>
      <span className="text-muted-foreground text-sm shrink-0">→</span>
    </Link>
  );
}
