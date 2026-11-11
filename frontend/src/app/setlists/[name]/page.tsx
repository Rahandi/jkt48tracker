import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { PastShows, ShowRow, type SlimShow as SlimShowT } from "@/components/setlists/PastShows";
import { getTeamColor, TEAM_COLORS } from "@/lib/teamColors";
import tracklists from "@/data/setlist-tracklists.json";
import idTitlesRaw from "@/data/song-id-titles.json";

const BACKEND = process.env.BACKEND_URL || "http://localhost:8000";

const TEAM_LABEL: Record<string, string> = {
  LOVE: "Team Love",
  DREAM: "Team Dream",
  PASSION: "Team Passion",
  TRAINEE: "Trainee",
  JKT48_VIRTUAL: "Virtual",
};

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
    `${BACKEND}/api/theater-schedules/stats/setlists`,
    { next: { revalidate: 3600 } }
  );
  if (!res.ok) return null;
  const all: Setlist[] = await res.json();
  return all.find((s) => s.setlist_name === name) ?? null;
}

async function getShows(name: string): Promise<Show[]> {
  const params = new URLSearchParams({
    setlist_name: name,
    past: "true",
  });
  const res = await fetch(
    `${BACKEND}/api/theater-schedules/?${params}`,
    { next: { revalidate: 3600 } }
  );
  if (!res.ok) return [];
  return res.json();
}

async function getUpcomingShows(name: string): Promise<Show[]> {
  const params = new URLSearchParams({ setlist_name: name, upcoming: "true" });
  const res = await fetch(
    `${BACKEND}/api/theater-schedules/?${params}`,
    { next: { revalidate: 3600 } }
  );
  if (!res.ok) return [];
  return res.json();
}

async function getMembers(): Promise<Member[]> {
  const res = await fetch(`${BACKEND}/api/members/`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) return [];
  return res.json();
}

type TrackEntry = { track: string; name: string };
type TracklistData = Record<string, { wiki_page: string; songs: TrackEntry[] }>;
const idTitles = idTitlesRaw as Record<string, string | null>;

function getTracklist(setlistName: string): TrackEntry[] | null {
  const data = tracklists as TracklistData;
  return data[setlistName]?.songs ?? null;
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

export async function generateStaticParams() {
  const res = await fetch(`${BACKEND}/api/theater-schedules/stats/setlists`);
  const all: Setlist[] = res.ok ? await res.json() : [];
  return all.map((x) => ({ name: x.setlist_name }));
}

export default async function SetlistDetailPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name: encodedName } = await params;
  const name = decodeURIComponent(encodedName);

  const [info, shows, upcomingShows, members] = await Promise.all([
    getSetlistInfo(name),
    getShows(name),
    getUpcomingShows(name),
    getMembers(),
  ]);

  if (!info) notFound();

  const memberMap = new Map(members.map((m) => [m.jkt48_id, m]));
  const teamEntries = deriveTeamCounts(shows, memberMap);
  const rawTracklist = getTracklist(name);
  const tracklist = rawTracklist?.filter(
    (t) => !t.name.toLowerCase().includes("overture") && t.track !== "M00"
  ) ?? null;
  const mainSongs = tracklist?.filter((t) => t.track.startsWith("M")) ?? [];
  const encoreSongs = tracklist?.filter((t) => t.track.startsWith("EN")) ?? [];

  const slim = (x: Show): SlimShowT => ({
    id: x.id,
    show_date: x.show_date,
    show_time: x.show_time,
    member_count: x.member_count,
    seitansai_members: x.seitansai_members,
    members: x.members.slice(0, 12).map((m) => ({
      name: m.name,
      image_url: (m.jkt48_id && memberMap.get(m.jkt48_id)?.image_url) || null,
    })),
  });
  const slimPast = shows.map(slim);
  const slimUpcoming = upcomingShows.map(slim);

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

        {/* Tracklist */}
        {tracklist && tracklist.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Tracklist
            </h2>
            <Card>
              <CardContent className="py-4 px-4">
                <div className="flex flex-col gap-y-1">
                  {mainSongs.map((t, i) => {
                    const idTitle = idTitles[t.name] ?? null;
                    return (
                      <Link
                        key={t.track}
                        href={`/songs/${encodeURIComponent(t.name)}`}
                        className="flex items-baseline gap-2 py-1 border-b border-border/40 last:border-0 hover:bg-secondary/40 rounded transition-colors group"
                      >
                        <span className="text-[10px] font-mono text-muted-foreground/60 w-10 shrink-0 text-right">
                          M{String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="text-sm text-foreground group-hover:text-primary transition-colors">
                          {idTitle ? `${idTitle} (${t.name})` : t.name}
                        </span>
                      </Link>
                    );
                  })}
                  {encoreSongs.map((t, i) => {
                    const idTitle = idTitles[t.name] ?? null;
                    return (
                      <Link
                        key={t.track}
                        href={`/songs/${encodeURIComponent(t.name)}`}
                        className="flex items-baseline gap-2 py-1 border-b border-border/40 last:border-0 hover:bg-secondary/40 rounded transition-colors group"
                      >
                        <span className="text-[10px] font-mono text-primary/70 w-10 shrink-0 text-right">
                          EN{String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="text-sm text-foreground group-hover:text-primary transition-colors">
                          {idTitle ? `${idTitle} (${t.name})` : t.name}
                        </span>
                      </Link>
                    );
                  })}
                </div>
                <p className="text-[10px] text-muted-foreground/50 mt-3">
                  Source: AKB48 Wiki
                </p>
              </CardContent>
            </Card>
          </div>
        )}

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
        {slimUpcoming.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Upcoming
            </h2>
            <div className="flex flex-col gap-2">
              {slimUpcoming.map((s) => (
                <ShowRow key={s.id} s={s} />
              ))}
            </div>
          </div>
        )}

        <PastShows shows={slimPast} encodedName={encodedName} total={info.count} />
      </main>
    </div>
  );
}
