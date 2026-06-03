import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { formatDate, calcAge } from "@/lib/utils";
import { isAtMilestone, nextMilestone, showsUntilMilestone, findMilestoneShow } from "@/lib/milestones";
import { ShowsByYearChart } from "@/components/charts/ShowsByYearChart";
import { getTeamColor } from "@/lib/teamColors";

const TEAM_LABEL: Record<string, string> = {
  LOVE: "Team Love",
  DREAM: "Team Dream",
  PASSION: "Team Passion",
  TRAINEE: "Trainee",
  JKT48_VIRTUAL: "JKT48 Virtual",
};

type Member = {
  id: number;
  jkt48_id: string;
  name: string;
  nickname: string | null;
  image_url: string | null;
  dob: string | null;
  height: number | null;
  blood_type: string | null;
  horoscope: string | null;
  twitter: string | null;
  instagram: string | null;
  team: string | null;
  graduated_at: number | null;
};

type ScheduleMember = { id: number; name: string; jkt48_id: string | null };

type TheaterSchedule = {
  id: number;
  show_date: string | null;
  show_time: string | null;
  setlist_name: string | null;
  members: ScheduleMember[];
};

async function getMember(jkt48_id: string): Promise<Member | null> {
  if (!process.env.BACKEND_URL) return null;
  const res = await fetch(
    `${process.env.BACKEND_URL}/api/members/${jkt48_id}`,
    { next: { revalidate: 3600 } }
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to fetch member");
  return res.json();
}

type TheaterStats = { total: number; tracked: number; by_year: { year: number; count: number }[] };

type RecentShow = { id: number; show_date: string | null; show_time: string | null; setlist_name: string | null };

async function getUpcomingSchedules(): Promise<TheaterSchedule[]> {
  if (!process.env.BACKEND_URL) return [];
  const res = await fetch(
    `${process.env.BACKEND_URL}/api/theater-schedules/?upcoming=true`,
    { next: { revalidate: 3600 } }
  );
  if (!res.ok) return [];
  return res.json();
}

async function getMemberTheaterStats(jkt48_id: string): Promise<TheaterStats> {
  if (!process.env.BACKEND_URL) return { total: 0, tracked: 0, by_year: [] };
  const res = await fetch(
    `${process.env.BACKEND_URL}/api/members/${jkt48_id}/theater-stats`,
    { next: { revalidate: 3600 } }
  );
  if (!res.ok) return { total: 0, tracked: 0, by_year: [] };
  return res.json();
}

async function getRecentShows(jkt48_id: string): Promise<RecentShow[]> {
  if (!process.env.BACKEND_URL) return [];
  const res = await fetch(
    `${process.env.BACKEND_URL}/api/members/${jkt48_id}/shows?limit=10`,
    { next: { revalidate: 3600 } }
  );
  if (!res.ok) return [];
  return res.json();
}

type MemberStat = { jkt48_id: string | null; name: string; show_count: number };
async function getMemberStats(): Promise<MemberStat[]> {
  if (!process.env.BACKEND_URL) return [];
  const res = await fetch(
    `${process.env.BACKEND_URL}/api/theater-schedules/member-stats`,
    { next: { revalidate: 3600 } }
  );
  if (!res.ok) return [];
  return res.json();
}

type ShowLinkItem = { id: number; show_date: string | null; show_time: string | null; setlist_name: string | null };
function ShowLink({ s }: { s: ShowLinkItem }) {
  return (
    <Link
      href={`/theater/${s.id}`}
      className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl bg-card ring-1 ring-border hover:ring-primary/60 transition-all duration-200"
    >
      <div className="min-w-0">
        <p className="font-medium text-foreground text-sm truncate">
          {s.setlist_name ?? "TBA"}
        </p>
        <p className="text-muted-foreground text-xs mt-0.5">
          {s.show_date ? formatDate(s.show_date) : "Date TBA"}
          {s.show_time && <span className="ml-1.5">· {s.show_time} WIB</span>}
        </p>
      </div>
      <span className="text-muted-foreground text-sm shrink-0">→</span>
    </Link>
  );
}

type StatRowProps = { label: string; value: React.ReactNode };
function StatRow({ label, value }: StatRowProps) {
  return (
    <div className="flex items-start gap-4 py-3 border-b border-border last:border-0">
      <span className="text-muted-foreground text-sm w-28 shrink-0">{label}</span>
      <span className="text-foreground text-sm">{value ?? "—"}</span>
    </div>
  );
}

export default async function MemberPage({
  params,
}: {
  params: Promise<{ jkt48_id: string }>;
}) {
  const { jkt48_id } = await params;
  const [member, upcomingSchedules, theaterStats, recentShows, allStats] = await Promise.all([
    getMember(jkt48_id),
    getUpcomingSchedules(),
    getMemberTheaterStats(jkt48_id),
    getRecentShows(jkt48_id),
    getMemberStats(),
  ]);
  if (!member) notFound();

  const age = calcAge(member.dob);
  const upcomingShows = upcomingSchedules.filter((s) =>
    s.members.some((m) => m.jkt48_id === jkt48_id)
  );

  const rank = allStats.findIndex((s) => s.jkt48_id === jkt48_id) + 1;
  const teamColor = getTeamColor(member.team);

  // Milestone progress
  const myCount = theaterStats.total;
  const sortedUpcomingShows = [...upcomingShows].sort((a, b) => {
    const da = a.show_date ?? "";
    const db = b.show_date ?? "";
    if (da !== db) return da.localeCompare(db);
    return (a.show_time ?? "").localeCompare(b.show_time ?? "");
  });
  const milestoneShow = myCount > 0 ? findMilestoneShow(myCount, sortedUpcomingShows, 7) : null;

  return (
    <div className="min-h-screen">
      <main className="px-4 py-8 sm:px-6 max-w-3xl mx-auto">
        <Link
          href="/members"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          ← All Members
        </Link>
        <div className="flex flex-col sm:flex-row gap-8">
          {/* Photo */}
          <div className="shrink-0 mx-auto sm:mx-0">
            <div
              className="w-52 rounded-2xl overflow-hidden bg-muted ring-1 ring-border"
              style={teamColor ? { boxShadow: `0 0 0 2px ${teamColor.hex}40` } : undefined}
            >
              {member.image_url ? (
                <Image
                  src={member.image_url}
                  alt={member.name}
                  width={208}
                  height={277}
                  className="w-full aspect-[3/4] object-cover"
                  priority
                />
              ) : (
                <div className="w-full aspect-[3/4] flex items-center justify-center">
                  <span className="text-muted-foreground text-5xl">?</span>
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-foreground leading-tight">
                {member.name}
              </h1>
              {member.nickname && (
                <p className="text-muted-foreground mt-1">"{member.nickname}"</p>
              )}
              <div className="flex gap-2 mt-3 flex-wrap items-center">
                {member.graduated_at && (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                    Graduated {new Date(member.graduated_at * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                )}
                {member.team && TEAM_LABEL[member.team] && (
                  <span
                    className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                    style={
                      teamColor
                        ? { backgroundColor: teamColor.bg, color: teamColor.text, border: `1px solid ${teamColor.hex}50` }
                        : undefined
                    }
                  >
                    {TEAM_LABEL[member.team]}
                  </span>
                )}
                {member.blood_type && (
                  <Badge variant="outline">Blood Type {member.blood_type}</Badge>
                )}
                {member.horoscope && (
                  <Badge variant="secondary">{member.horoscope}</Badge>
                )}
                {rank > 0 && (
                  <span className="text-xs text-muted-foreground">
                    #{rank} by show count
                  </span>
                )}
              </div>
            </div>

            <div>
              <StatRow
                label="Born"
                value={
                  member.dob ? (
                    <span>
                      {formatDate(member.dob)}
                      {age !== null && (
                        <span className="text-muted-foreground ml-1">
                          ({age} years old)
                        </span>
                      )}
                    </span>
                  ) : null
                }
              />
              <StatRow
                label="Height"
                value={member.height ? `${member.height} cm` : null}
              />
              {(member.twitter || member.instagram) && (
                <div className="flex items-start gap-4 py-3">
                  <span className="text-muted-foreground text-sm w-28 shrink-0">Social</span>
                  <div className="flex gap-3">
                    {member.twitter && (
                      <a
                        href={`https://twitter.com/${member.twitter}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        @{member.twitter}
                      </a>
                    )}
                    {member.instagram && (
                      <a
                        href={`https://instagram.com/${member.instagram}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        IG: {member.instagram}
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Theater stats chart */}
        {theaterStats.by_year.length > 0 && (
          <div className="mt-10">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Theater Shows per Year
              </h2>
              <span className="text-xs text-muted-foreground">
                {theaterStats.total} shows
              </span>
            </div>
            <ShowsByYearChart data={theaterStats.by_year} />
            {theaterStats.total > theaterStats.tracked ? (
              <p className="text-xs text-muted-foreground mt-2">
                * {theaterStats.total - theaterStats.tracked} untracked shows are not reflected in the chart.{" "}
                <a href="/contribute" className="underline underline-offset-2 hover:text-foreground transition-colors">
                  Help complete the data.
                </a>
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-2">
                * Some older shows are missing member records and are not counted here.{" "}
                <a href="/contribute" className="underline underline-offset-2 hover:text-foreground transition-colors">
                  Help complete the data.
                </a>
              </p>
            )}
          </div>
        )}

        {/* Milestone Progress */}
        {myCount > 0 && (
          <div className="mt-10">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Milestone Progress
            </h2>
            {isAtMilestone(myCount) ? (
              <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 px-4 py-3">
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                  ★ Reached {myCount} shows!
                </p>
                <p className="text-xs text-amber-600/70 dark:text-amber-400/70 mt-0.5">
                  Next milestone: {nextMilestone(myCount)} shows
                </p>
              </div>
            ) : (
              <div className="rounded-xl bg-card ring-1 ring-border px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">
                    {myCount} <span className="text-muted-foreground font-normal">/ {nextMilestone(myCount)}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {showsUntilMilestone(myCount)} to go
                  </span>
                </div>
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${myCount % 100}%` }}
                  />
                </div>
                {milestoneShow && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Reaching{" "}
                    <span className="font-semibold text-foreground">{milestoneShow.milestoneCount}</span>{" "}
                    on{" "}
                    <Link href={`/theater/${milestoneShow.showId}`} className="text-primary hover:underline">
                      {formatDate(milestoneShow.showDate)}
                    </Link>
                    {milestoneShow.showsAway > 1 && (
                      <span className="text-muted-foreground"> ({milestoneShow.showsAway} shows away)</span>
                    )}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Upcoming Theater Shows */}
        {upcomingShows.length > 0 && (
          <div className="mt-10">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Upcoming Theater Shows
            </h2>
            <div className="flex flex-col gap-2">
              {upcomingShows.map((s) => (
                <ShowLink key={s.id} s={s} />
              ))}
            </div>
          </div>
        )}

        {/* Recent Past Shows */}
        {recentShows.length > 0 && (
          <div className="mt-10">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Recent Shows
              </h2>
              {theaterStats.total > 10 && (
                <span className="text-xs text-muted-foreground">
                  Showing 10 of {theaterStats.total}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              {recentShows.map((s) => (
                <ShowLink key={s.id} s={s} />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
