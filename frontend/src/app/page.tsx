import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { TopPerformers } from "./_components/TopPerformers";
import { ShowsByYearChart } from "@/components/charts/ShowsByYearChart";
import { getTeamColor } from "@/lib/teamColors";

type Member = {
  id: number;
  jkt48_id: string;
  name: string;
  nickname: string | null;
  image_url: string | null;
};

type UpcomingBirthday = {
  jkt48_id: string;
  name: string;
  nickname: string | null;
  image_url: string | null;
  team: string | null;
  dob: string;
  days_until: number;
  next_birthday: string;
};

type ScheduleMember = { id: number; name: string; jkt48_id: string | null };

type TheaterSchedule = {
  id: number;
  show_date: string | null;
  show_time: string | null;
  setlist_name: string | null;
  member_count: number;
  members: ScheduleMember[];
};

type MemberStat = { jkt48_id: string | null; name: string; show_count: number };

async function getMembers(): Promise<Member[]> {
  const res = await fetch(`${process.env.BACKEND_URL}/api/members/`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) return [];
  return res.json();
}

async function getSchedules(
  filter: "upcoming" | "past",
  limit?: number
): Promise<TheaterSchedule[]> {
  const params = new URLSearchParams({ [`${filter}`]: "true" });
  if (limit) params.set("limit", String(limit));
  const res = await fetch(
    `${process.env.BACKEND_URL}/api/theater-schedules/?${params}`,
    { next: { revalidate: 3600 } }
  );
  if (!res.ok) return [];
  return res.json();
}

async function getShowsByYear(): Promise<{ year: number; count: number }[]> {
  const res = await fetch(
    `${process.env.BACKEND_URL}/api/theater-schedules/stats/by-year`,
    { next: { revalidate: 3600 } }
  );
  if (!res.ok) return [];
  return res.json();
}

async function getMemberStats(): Promise<MemberStat[]> {
  const res = await fetch(
    `${process.env.BACKEND_URL}/api/theater-schedules/member-stats`,
    { next: { revalidate: 3600 } }
  );
  if (!res.ok) return [];
  return res.json();
}

async function getUpcomingBirthdays(): Promise<UpcomingBirthday[]> {
  const res = await fetch(
    `${process.env.BACKEND_URL}/api/members/upcoming-birthdays?days=30`,
    { next: { revalidate: 3600 } }
  );
  if (!res.ok) return [];
  return res.json();
}

function ShowCard({
  s,
  memberMap,
}: {
  s: TheaterSchedule;
  memberMap: Map<string, Member>;
}) {
  return (
    <Link href={`/theater/${s.id}`}>
      <Card className="hover:ring-2 hover:ring-primary/60 transition-all duration-200 cursor-pointer">
        <CardContent className="py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground text-base leading-tight truncate">
                {s.setlist_name ?? "TBA"}
              </h3>
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

export default async function HomePage() {
  const [members, upcomingSchedules, pastSchedules, memberStats, showsByYear, upcomingBirthdays] =
    await Promise.all([
      getMembers(),
      getSchedules("upcoming"),
      getSchedules("past", 5),
      getMemberStats(),
      getShowsByYear(),
      getUpcomingBirthdays(),
    ]);

  const memberMap = new Map(members.map((m) => [m.jkt48_id, m]));
  const totalShows = showsByYear.reduce((sum, d) => sum + d.count, 0);
  const nextShow = upcomingSchedules[0] ?? null;

  const topMembersWithPhotos = memberStats
    .filter((ms) => ms.jkt48_id && memberMap.get(ms.jkt48_id as string)?.image_url)
    .slice(0, 12)
    .map((ms) => memberMap.get(ms.jkt48_id as string)!)
    .filter(Boolean);

  return (
    <div className="min-h-screen">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative pt-12 pb-14 overflow-hidden">
        <div
          className="absolute inset-0 -z-10 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 70% -10%, rgba(228,0,43,0.10) 0%, transparent 65%)",
          }}
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-10">
            {/* Left: text + CTAs + avatar strip */}
            <div className="max-w-xl">
              <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">
                Since December 2011
              </p>
              <h1 className="text-4xl sm:text-5xl font-bold text-foreground leading-tight mb-3">
                Every JKT48 theater show,
                <br />
                <span className="text-primary">tracked.</span>
              </h1>
              <p className="text-muted-foreground text-base">
                Member stats, setlist history, and upcoming schedules — all in one place.
              </p>

              {/* CTA buttons */}
              <div className="flex gap-3 mt-7 flex-wrap">
                <Link
                  href="/members"
                  className="px-5 py-2.5 rounded-full text-sm font-semibold bg-primary text-white hover:bg-primary/90 transition-colors"
                >
                  Browse Members
                </Link>
                <Link
                  href="/theater"
                  className="px-5 py-2.5 rounded-full text-sm font-semibold bg-secondary text-secondary-foreground border border-border hover:bg-secondary/70 transition-colors"
                >
                  Theater Schedule
                </Link>
              </div>

              {/* Top member avatar strip */}
              {topMembersWithPhotos.length > 0 && (
                <div className="flex items-center gap-3 mt-6">
                  <div className="flex -space-x-2">
                    {topMembersWithPhotos.map((m) => (
                      <Image
                        key={m.jkt48_id}
                        src={m.image_url!}
                        alt={m.name}
                        width={36}
                        height={36}
                        className="w-9 h-9 rounded-full object-cover ring-2 ring-background"
                      />
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {members.length}+ members tracked
                  </span>
                </div>
              )}
            </div>

            {/* Right: stats card + next show */}
            <div className="shrink-0 flex flex-col gap-4 lg:w-72">
              <div className="flex flex-row lg:flex-col gap-8 lg:gap-0 lg:divide-y lg:divide-border lg:border lg:border-border lg:rounded-2xl lg:overflow-hidden">
                <Link href="/members" className="group lg:px-8 lg:py-5 lg:hover:bg-secondary/50 transition-colors">
                  <span className="block text-4xl sm:text-5xl font-bold text-foreground group-hover:text-primary transition-colors">
                    {members.length}
                  </span>
                  <span className="text-muted-foreground text-sm mt-1 block">Active Members</span>
                </Link>
                <div className="lg:px-8 lg:py-5">
                  <span className="block text-4xl sm:text-5xl font-bold text-foreground">
                    {totalShows.toLocaleString()}
                  </span>
                  <span className="text-muted-foreground text-sm mt-1 block">Shows Recorded</span>
                </div>
                <Link href="/theater" className="group lg:px-8 lg:py-5 lg:hover:bg-secondary/50 transition-colors">
                  <span className="block text-4xl sm:text-5xl font-bold text-foreground group-hover:text-primary transition-colors">
                    {memberStats.length}
                  </span>
                  <span className="text-muted-foreground text-sm mt-1 block">All-time Performers</span>
                </Link>
              </div>

              {/* Next show card */}
              {nextShow && (
                <Link href={`/theater/${nextShow.id}`}>
                  <Card className="hover:ring-2 hover:ring-primary/60 transition-all duration-200 cursor-pointer">
                    <CardContent className="py-4 px-5">
                      <span className="text-[10px] font-bold text-primary uppercase tracking-widest">
                        Next Show
                      </span>
                      <p className="font-semibold text-foreground mt-1 leading-tight">
                        {nextShow.setlist_name ?? "TBA"}
                      </p>
                      <p className="text-muted-foreground text-xs mt-1">
                        {nextShow.show_date ? formatDate(nextShow.show_date) : "Date TBA"}
                        {nextShow.show_time && ` · ${nextShow.show_time} WIB`}
                      </p>
                      {nextShow.members.length > 0 && (
                        <div className="flex -space-x-1.5 mt-3">
                          {nextShow.members.slice(0, 10).map((m, i) => {
                            const info = m.jkt48_id ? memberMap.get(m.jkt48_id) : undefined;
                            return info?.image_url ? (
                              <Image
                                key={i}
                                src={info.image_url}
                                alt={m.name}
                                width={24}
                                height={24}
                                className="w-6 h-6 rounded-full object-cover ring-1 ring-card"
                              />
                            ) : (
                              <div
                                key={i}
                                className="w-6 h-6 rounded-full bg-muted ring-1 ring-card flex items-center justify-center"
                              >
                                <span className="text-[8px] text-muted-foreground font-semibold">
                                  {m.name[0]}
                                </span>
                              </div>
                            );
                          })}
                          {nextShow.member_count > 10 && (
                            <span className="text-xs text-muted-foreground ml-2 self-center">
                              +{nextShow.member_count - 10}
                            </span>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Upcoming Birthdays ───────────────────────────── */}
      {upcomingBirthdays.length > 0 && (
        <div className="border-b border-border bg-secondary/30 py-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Upcoming Birthdays
              </span>
              <span className="text-xs text-muted-foreground">next 30 days</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1 px-1 py-1 scrollbar-none">
              {upcomingBirthdays.map((b) => {
                const color = getTeamColor(b.team);
                const label = b.days_until === 0 ? "Today!" : b.days_until === 1 ? "Tomorrow" : `in ${b.days_until}d`;
                return (
                  <Link
                    key={b.jkt48_id}
                    href={`/members/${b.jkt48_id}`}
                    className="flex flex-col items-center gap-1.5 shrink-0 group"
                  >
                    <div
                      className="relative w-12 h-12 rounded-full overflow-hidden transition-all group-hover:scale-105"
                      style={{ outline: `2px solid ${color?.hex ?? "var(--border)"}`, outlineOffset: "2px" }}
                    >
                      {b.image_url ? (
                        <Image src={b.image_url} alt={b.name} width={48} height={48} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <span className="text-sm font-semibold text-muted-foreground">{b.name[0]}</span>
                        </div>
                      )}
                      {b.days_until === 0 && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                          <span className="text-base">🎂</span>
                        </div>
                      )}
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-medium text-foreground leading-tight truncate w-14">
                        {b.nickname ?? b.name.split(" ")[0]}
                      </p>
                      <p
                        className="text-[9px] font-semibold mt-0.5"
                        style={{ color: b.days_until === 0 ? "var(--primary)" : color?.text ?? "var(--muted-foreground)" }}
                      >
                        {label}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <main className="px-4 pb-12 sm:px-6 max-w-7xl mx-auto">
        {/* ── Top Performers ───────────────────────────────── */}
        <div className="mb-6">
          <TopPerformers memberStats={memberStats} memberMap={memberMap} />
        </div>

        {/* ── Shows per Year ────────────────────────────────── */}
        {showsByYear.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Shows per Year
              </h2>
              <Link
                href="/theater"
                className="text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                View all →
              </Link>
            </div>
            <Card>
              <CardContent className="py-4 px-4">
                <ShowsByYearChart data={showsByYear} />
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Shows grid ──────────────────────────────────── */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Upcoming Shows */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Upcoming Shows
              </h2>
              <Link
                href="/theater"
                className="text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                View all →
              </Link>
            </div>
            {upcomingSchedules.length === 0 ? (
              <p className="text-muted-foreground text-sm">No upcoming shows.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {upcomingSchedules.slice(0, 5).map((s) => (
                  <ShowCard key={s.id} s={s} memberMap={memberMap} />
                ))}
              </div>
            )}
          </section>

          {/* Recent Past Shows */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Recent Past Shows
              </h2>
              <Link
                href="/theater?tab=past"
                className="text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                View all →
              </Link>
            </div>
            {pastSchedules.length === 0 ? (
              <p className="text-muted-foreground text-sm">No past shows.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {pastSchedules.map((s) => (
                  <ShowCard key={s.id} s={s} memberMap={memberMap} />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
