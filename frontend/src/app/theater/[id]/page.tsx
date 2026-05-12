import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { getTeamColor, TEAM_COLORS } from "@/lib/teamColors";
import { ContributeShowMembers } from "@/components/theater/ContributeShowMembers";
import { ContributeShowInfo } from "@/components/theater/ContributeShowInfo";

const TEAM_LABEL: Record<string, string> = {
  LOVE: "Team Love",
  DREAM: "Team Dream",
  PASSION: "Team Passion",
  TRAINEE: "Trainee",
  JKT48_VIRTUAL: "Virtual",
};

type ScheduleMember = { id: number; name: string; jkt48_id: string | null };

type TheaterSchedule = {
  id: number;
  jkt48_schedule_id: string;
  show_date: string | null;
  show_time: string | null;
  setlist_name: string | null;
  setlist_total_count?: number;
  seitansai_members: string | null;
  members: ScheduleMember[];
  related_shows?: { id: number; show_date: string | null; show_time: string | null }[];
};

type Member = {
  id: number;
  jkt48_id: string;
  name: string;
  image_url: string | null;
  team: string | null;
};

type MemberStat = { jkt48_id: string | null; name: string; show_count: number };

type Adjacent = {
  prev: { id: number; show_date: string | null; show_time: string | null; setlist_name: string | null } | null;
  next: { id: number; show_date: string | null; show_time: string | null; setlist_name: string | null } | null;
};

async function getSchedule(id: string): Promise<TheaterSchedule | null> {
  if (!process.env.BACKEND_URL) return null;
  const res = await fetch(
    `${process.env.BACKEND_URL}/api/theater-schedules/${id}`,
    { next: { revalidate: 3600 } }
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to fetch schedule");
  return res.json();
}

async function getAdjacent(id: string): Promise<Adjacent> {
  if (!process.env.BACKEND_URL) return { prev: null, next: null };
  const res = await fetch(
    `${process.env.BACKEND_URL}/api/theater-schedules/${id}/adjacent`,
    { next: { revalidate: 3600 } }
  );
  if (!res.ok) return { prev: null, next: null };
  return res.json();
}

async function getMembers(): Promise<Member[]> {
  if (!process.env.BACKEND_URL) return [];
  const res = await fetch(`${process.env.BACKEND_URL}/api/members/`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) return [];
  return res.json();
}

async function getMemberStats(): Promise<MemberStat[]> {
  if (!process.env.BACKEND_URL) return [];
  const res = await fetch(
    `${process.env.BACKEND_URL}/api/theater-schedules/member-stats`,
    { next: { revalidate: 3600 } }
  );
  if (!res.ok) return [];
  return res.json();
}

export default async function TheaterShowPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [schedule, adjacent, members, memberStats] = await Promise.all([
    getSchedule(id),
    getAdjacent(id),
    getMembers(),
    getMemberStats(),
  ]);
  if (!schedule) notFound();

  const memberMap = new Map(members.map((m) => [m.jkt48_id, m]));

  // rank lookup: jkt48_id → { rank, show_count }
  const statMap = new Map(
    memberStats.map((s, i) => [s.jkt48_id, { rank: i + 1, show_count: s.show_count }])
  );

  // seitansai honorees from the API (comma-separated names)
  const seitansaiNames = new Set(
    schedule.seitansai_members
      ? schedule.seitansai_members.split(",").map((n) => n.trim().toLowerCase())
      : []
  );

  // team breakdown from performing members
  const teamCounts: Record<string, number> = {};
  for (const m of schedule.members) {
    if (m.jkt48_id) {
      const info = memberMap.get(m.jkt48_id);
      if (info?.team) teamCounts[info.team] = (teamCounts[info.team] ?? 0) + 1;
    }
  }
  const teamTotal = schedule.members.length;
  const teamEntries = Object.entries(teamCounts).sort(([, a], [, b]) => b - a);

  return (
    <div className="min-h-screen">
      <main className="px-4 py-8 sm:px-6 max-w-5xl mx-auto">

        {/* Back + prev/next navigation */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/theater"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Theater
          </Link>
          <div className="flex items-center gap-2">
            {adjacent.prev ? (
              <Link
                href={`/theater/${adjacent.prev.id}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/70 transition-colors text-xs font-medium text-secondary-foreground"
                title={adjacent.prev.setlist_name ?? "Previous show"}
              >
                ← Prev
                <span className="text-muted-foreground hidden sm:inline">
                  · {adjacent.prev.show_date ? formatDate(adjacent.prev.show_date) : ""}
                </span>
              </Link>
            ) : (
              <span className="px-3 py-1.5 text-xs text-muted-foreground/40">← Prev</span>
            )}
            {adjacent.next ? (
              <Link
                href={`/theater/${adjacent.next.id}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/70 transition-colors text-xs font-medium text-secondary-foreground"
                title={adjacent.next.setlist_name ?? "Next show"}
              >
                <span className="text-muted-foreground hidden sm:inline">
                  {adjacent.next.show_date ? formatDate(adjacent.next.show_date) : ""} ·
                </span>
                Next →
              </Link>
            ) : (
              <span className="px-3 py-1.5 text-xs text-muted-foreground/40">Next →</span>
            )}
          </div>
        </div>

        {/* Show info */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 mb-8">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold text-foreground leading-tight">
              {schedule.setlist_name ?? "TBA"}
            </h1>
            <p className="text-muted-foreground mt-2 text-base">
              {schedule.show_date ? formatDate(schedule.show_date) : "Date TBA"}
              {schedule.show_time && (
                <span className="ml-2">· {schedule.show_time} WIB</span>
              )}
            </p>
            {schedule.seitansai_members && (
              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-base">🎂</span>
                <span className="text-sm text-muted-foreground">
                  Seitansai — {schedule.seitansai_members}
                </span>
              </div>
            )}
            <div className="mt-3">
              <ContributeShowInfo jkt48ScheduleId={schedule.jkt48_schedule_id} />
            </div>
          </div>

          <div className="flex flex-col items-end gap-3 shrink-0">
            <div className="flex gap-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-foreground">{schedule.members.length}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Performers</p>
              </div>
              {schedule.setlist_total_count != null && (
                <>
                  <div className="w-px bg-border" />
                  <div className="text-center">
                    <p className="text-3xl font-bold text-primary">{schedule.setlist_total_count}×</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Times performed</p>
                  </div>
                </>
              )}
            </div>
            {schedule.setlist_name && (
              <Link
                href={`/setlists/${encodeURIComponent(schedule.setlist_name)}`}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-xs font-medium hover:bg-primary hover:text-white transition-colors"
              >
                View Setlist →
              </Link>
            )}
          </div>
        </div>

        {/* Team breakdown */}
        {teamEntries.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Team Lineup
            </h2>
            <Card>
              <CardContent className="py-4 px-4">
                <div className="flex rounded-full overflow-hidden h-3 mb-3">
                  {teamEntries.map(([team, count]) => {
                    const color = getTeamColor(team);
                    return (
                      <div
                        key={team}
                        style={{
                          width: `${(count / teamTotal) * 100}%`,
                          backgroundColor: color?.hex ?? "var(--muted)",
                        }}
                      />
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-3">
                  {teamEntries.map(([team, count]) => {
                    const color = getTeamColor(team);
                    return (
                      <div key={team} className="flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: color?.hex ?? "var(--muted)" }}
                        />
                        <span className="text-xs text-foreground font-medium">
                          {TEAM_LABEL[team] ?? team}
                        </span>
                        <span className="text-xs text-muted-foreground">{count}</span>
                      </div>
                    );
                  })}
                  {schedule.members.filter(m => !m.jkt48_id || !memberMap.get(m.jkt48_id as string)?.team).length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-muted" />
                      <span className="text-xs text-muted-foreground">
                        {schedule.members.filter(m => !m.jkt48_id || !memberMap.get(m.jkt48_id as string)?.team).length} unknown
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Member grid */}
        <div className="mb-10">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Performing Members
          </h2>

          {schedule.members.length === 0 ? (
            <div>
              <p className="text-muted-foreground text-sm">Member list not available for this show.</p>
              <ContributeShowMembers jkt48ScheduleId={schedule.jkt48_schedule_id} />
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
              {schedule.members.map((m) => {
                const info = m.jkt48_id ? memberMap.get(m.jkt48_id) : undefined;
                const stat = m.jkt48_id ? statMap.get(m.jkt48_id) : undefined;
                const isSeitansai = seitansaiNames.has(m.name.toLowerCase());
                const teamColor = getTeamColor(info?.team ?? null);

                const card = (
                  <div className="group text-center">
                    <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-muted ring-1 ring-border group-hover:ring-primary/60 transition-all duration-200"
                      style={teamColor ? { boxShadow: `0 0 0 2px ${teamColor.hex}30` } : undefined}
                    >
                      {info?.image_url ? (
                        <Image
                          src={info.image_url}
                          alt={m.name}
                          width={120}
                          height={160}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-muted-foreground text-xl font-semibold">
                            {m.name[0]}
                          </span>
                        </div>
                      )}
                      {isSeitansai && (
                        <div className="absolute top-1 right-1 text-base leading-none">🎂</div>
                      )}
                    </div>
                    <p className="text-[10px] font-medium text-foreground mt-1.5 leading-tight truncate">
                      {m.name}
                    </p>
                    {stat && (
                      <p className="text-[9px] text-muted-foreground mt-0.5">
                        #{stat.rank} · {stat.show_count}×
                      </p>
                    )}
                  </div>
                );

                return m.jkt48_id ? (
                  <Link key={m.id} href={`/members/${m.jkt48_id}`}>
                    {card}
                  </Link>
                ) : (
                  <div key={m.id}>{card}</div>
                );
              })}
            </div>
          )}
        </div>

        {/* Other performances of this setlist */}
        {schedule.related_shows && schedule.related_shows.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Other performances of &ldquo;{schedule.setlist_name}&rdquo;
              </h2>
              {schedule.setlist_total_count != null && schedule.setlist_total_count > 6 && (
                <Link
                  href={`/theater?tab=past`}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  View all →
                </Link>
              )}
            </div>
            <div className="flex flex-col gap-2">
              {schedule.related_shows.map((s) => (
                <Link
                  key={s.id}
                  href={`/theater/${s.id}`}
                  className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl bg-card ring-1 ring-border hover:ring-primary/60 transition-all duration-200"
                >
                  <p className="text-sm text-foreground">
                    {s.show_date ? formatDate(s.show_date) : "Date TBA"}
                    {s.show_time && (
                      <span className="text-muted-foreground ml-2">· {s.show_time} WIB</span>
                    )}
                  </p>
                  <span className="text-muted-foreground text-sm shrink-0">→</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
