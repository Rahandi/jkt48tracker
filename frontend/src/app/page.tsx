export const dynamic = "force-dynamic";

import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { TopPerformers } from "./_components/TopPerformers";
import { ShowsByYearChart } from "@/components/charts/ShowsByYearChart";
import { getTeamColor } from "@/lib/teamColors";
import { isAtMilestone, findMilestoneShow, showsUntilMilestone } from "@/lib/milestones";

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
  if (!process.env.BACKEND_URL) return [];
  const res = await fetch(`${process.env.BACKEND_URL}/api/members/`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) return [];
  return res.json();
}

async function getSchedules(
  filter: "upcoming" | "past" | "ongoing",
  limit?: number
): Promise<TheaterSchedule[]> {
  if (!process.env.BACKEND_URL) return [];
  const params = new URLSearchParams({ [`${filter}`]: "true" });
  if (limit) params.set("limit", String(limit));
  const res = await fetch(
    `${process.env.BACKEND_URL}/api/theater-schedules/?${params}`,
    { cache: "no-store" }
  );
  if (!res.ok) return [];
  return res.json();
}

async function getShowsByYear(): Promise<{ year: number; count: number }[]> {
  if (!process.env.BACKEND_URL) return [];
  const res = await fetch(
    `${process.env.BACKEND_URL}/api/theater-schedules/stats/by-year`,
    { next: { revalidate: 3600 } }
  );
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

async function getUpcomingBirthdays(): Promise<UpcomingBirthday[]> {
  if (!process.env.BACKEND_URL) return [];
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
                    className="w-7 h-7 rounded-full object-cover object-[center_15%] ring-2 ring-card"
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
  const [members, upcomingSchedules, ongoingSchedules, pastSchedules, memberStats, showsByYear, upcomingBirthdays] =
    await Promise.all([
      getMembers(),
      getSchedules("upcoming"),
      getSchedules("ongoing"),
      getSchedules("past", 5),
      getMemberStats(),
      getShowsByYear(),
      getUpcomingBirthdays(),
    ]);

  const memberMap = new Map(members.map((m) => [m.jkt48_id, m]));
  const totalShows = showsByYear.reduce((sum, d) => sum + d.count, 0);
  const featuredShow = ongoingSchedules[0] ?? upcomingSchedules[0] ?? null;
  const featuredLabel = ongoingSchedules.length > 0 ? "Happening Now" : "Next Show";

  const topMembersWithPhotos = memberStats
    .filter((ms) => ms.jkt48_id && memberMap.get(ms.jkt48_id as string)?.image_url)
    .slice(0, 12)
    .map((ms) => memberMap.get(ms.jkt48_id as string)!)
    .filter(Boolean);

  // ── Milestones ────────────────────────────────────────────────
  const memberStatsMap = new Map(memberStats.map((s) => [s.jkt48_id, s.show_count]));
  const todayWIB = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);

  // Members performing today (ongoing + past shows today)
  const todayShowMemberIds = new Set<string>();
  for (const s of [...ongoingSchedules, ...pastSchedules.filter((s) => s.show_date === todayWIB)]) {
    for (const m of s.members) {
      if (m.jkt48_id) todayShowMemberIds.add(m.jkt48_id);
    }
  }

  // Today's milestones: performing today AND count is exactly a multiple of 100
  const todayMilestones = [...todayShowMemberIds]
    .flatMap((jkt48_id) => {
      const count = memberStatsMap.get(jkt48_id);
      if (count === undefined || !isAtMilestone(count)) return [];
      const member = memberMap.get(jkt48_id);
      if (!member) return [];
      return [{ member, count }];
    });

  // Nearing milestones: will hit a milestone in an upcoming show within 7 days
  const sortedUpcoming = [...upcomingSchedules].sort((a, b) => {
    const da = a.show_date ?? "";
    const db = b.show_date ?? "";
    if (da !== db) return da.localeCompare(db);
    return (a.show_time ?? "").localeCompare(b.show_time ?? "");
  });

  const nearingMilestones: Array<{
    member: Member;
    milestoneCount: number;
    showsAway: number;
    showDate: string;
    showId: number;
  }> = [];
  for (const stat of memberStats) {
    if (!stat.jkt48_id || isAtMilestone(stat.show_count)) continue;
    const member = memberMap.get(stat.jkt48_id);
    if (!member) continue;
    const memberUpcoming = sortedUpcoming.filter((s) =>
      s.members.some((m) => m.jkt48_id === stat.jkt48_id)
    );
    const ms = findMilestoneShow(stat.show_count, memberUpcoming, 7);
    if (ms) nearingMilestones.push({ member, ...ms });
  }
  nearingMilestones.sort((a, b) => a.showsAway - b.showsAway);

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
                        className="w-9 h-9 rounded-full object-cover object-[center_15%] ring-2 ring-background"
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

              {/* Next show / Happening Now card */}
              {featuredShow && (
                <Link href={`/theater/${featuredShow.id}`}>
                  <Card className="hover:ring-2 hover:ring-primary/60 transition-all duration-200 cursor-pointer">
                    <CardContent className="py-4 px-5">
                      <div className="flex items-center gap-1.5">
                        {ongoingSchedules.length > 0 && (
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                          </span>
                        )}
                        <span className="text-[10px] font-bold text-primary uppercase tracking-widest">
                          {featuredLabel}
                        </span>
                      </div>
                      <p className="font-semibold text-foreground mt-1 leading-tight">
                        {featuredShow.setlist_name ?? "TBA"}
                      </p>
                      <p className="text-muted-foreground text-xs mt-1">
                        {featuredShow.show_date ? formatDate(featuredShow.show_date) : "Date TBA"}
                        {featuredShow.show_time && ` · ${featuredShow.show_time} WIB`}
                      </p>
                      {featuredShow.members.length > 0 && (
                        <div className="flex -space-x-1.5 mt-3">
                          {featuredShow.members.slice(0, 10).map((m, i) => {
                            const info = m.jkt48_id ? memberMap.get(m.jkt48_id) : undefined;
                            return info?.image_url ? (
                              <Image
                                key={i}
                                src={info.image_url}
                                alt={m.name}
                                width={24}
                                height={24}
                                className="w-6 h-6 rounded-full object-cover object-[center_15%] ring-1 ring-card"
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
                          {featuredShow.member_count > 10 && (
                            <span className="text-xs text-muted-foreground ml-2 self-center">
                              +{featuredShow.member_count - 10}
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
            <div className="flex gap-3 overflow-x-auto pt-3 pb-1 px-2 scrollbar-none">
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
                      className="relative w-12 h-12 transition-transform duration-200 group-hover:scale-110"
                      style={{
                        outline: `2px solid ${color?.hex ?? "var(--border)"}`,
                        outlineOffset: "2px",
                        borderRadius: "50%",
                      }}
                    >
                      {b.image_url ? (
                        <Image src={b.image_url} alt={b.name} width={48} height={48} className="w-full h-full object-cover" style={{ clipPath: "circle(50%)" }} />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center" style={{ clipPath: "circle(50%)" }}>
                          <span className="text-sm font-semibold text-muted-foreground">{b.name[0]}</span>
                        </div>
                      )}
                      {b.days_until === 0 && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center" style={{ clipPath: "circle(50%)" }}>
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

      {/* ── Milestones ──────────────────────────────────── */}
      {(todayMilestones.length > 0 || nearingMilestones.length > 0) && (
        <div className="border-b border-border bg-secondary/30 py-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            {todayMilestones.length > 0 && (
              <>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Today&#39;s Milestones
                  </span>
                  <span className="text-xs font-bold text-amber-500">★</span>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-1 px-2 scrollbar-none mb-4">
                  {todayMilestones.map(({ member, count }) => (
                    <Link
                      key={member.jkt48_id}
                      href={`/members/${member.jkt48_id}`}
                      className="flex flex-col items-center gap-1.5 shrink-0 group"
                    >
                      <div
                        className="relative w-12 h-12 transition-transform duration-200 group-hover:scale-110"
                        style={{ outline: "2px solid #f59e0b", outlineOffset: "2px", borderRadius: "50%" }}
                      >
                        {member.image_url ? (
                          <Image
                            src={member.image_url}
                            alt={member.name}
                            width={48}
                            height={48}
                            className="w-full h-full object-cover object-[center_15%]"
                            style={{ clipPath: "circle(50%)" }}
                          />
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center" style={{ clipPath: "circle(50%)" }}>
                            <span className="text-sm font-semibold text-muted-foreground">{member.name[0]}</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-amber-400/20 flex items-center justify-center" style={{ clipPath: "circle(50%)" }}>
                          <span className="text-base">★</span>
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] font-medium text-foreground leading-tight truncate w-14">
                          {member.nickname ?? member.name.split(" ")[0]}
                        </p>
                        <p className="text-[9px] font-bold mt-0.5 text-amber-600">{count} shows</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            )}
            {nearingMilestones.length > 0 && (
              <>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Nearing Milestone
                  </span>
                  <span className="text-xs text-muted-foreground">this week</span>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-1 px-2 scrollbar-none">
                  {nearingMilestones.map(({ member, milestoneCount, showsAway, showDate }) => (
                      <Link
                        key={member.jkt48_id}
                        href={`/members/${member.jkt48_id}`}
                        className="flex flex-col items-center gap-1.5 shrink-0 group"
                      >
                        <div
                          className="relative w-12 h-12 transition-transform duration-200 group-hover:scale-110"
                          style={{ outline: "2px solid var(--border)", outlineOffset: "2px", borderRadius: "50%" }}
                        >
                          {member.image_url ? (
                            <Image
                              src={member.image_url}
                              alt={member.name}
                              width={48}
                              height={48}
                              className="w-full h-full object-cover object-[center_15%]"
                              style={{ clipPath: "circle(50%)" }}
                            />
                          ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center" style={{ clipPath: "circle(50%)" }}>
                              <span className="text-sm font-semibold text-muted-foreground">{member.name[0]}</span>
                            </div>
                          )}
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] font-medium text-foreground leading-tight truncate w-14">
                            {member.nickname ?? member.name.split(" ")[0]}
                          </p>
                          <p className="text-[9px] font-semibold mt-0.5 text-foreground">{milestoneCount}★</p>
                          <p className="text-[9px] text-muted-foreground">
                            {showsAway === 1 ? "next show" : `${showsAway} away`} · {showDate.slice(5).replace("-", "/")}
                          </p>
                        </div>
                      </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <main className="px-4 pt-6 pb-12 sm:px-6 max-w-7xl mx-auto">
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

        {/* ── Happening Now ────────────────────────────────── */}
        {ongoingSchedules.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
              </span>
              <h2 className="text-xs font-semibold text-primary uppercase tracking-wider">
                Happening Now
              </h2>
            </div>
            <div className="flex flex-col gap-3">
              {ongoingSchedules.map((s) => (
                <ShowCard key={s.id} s={s} memberMap={memberMap} />
              ))}
            </div>
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
                {upcomingSchedules.length > 5 && (
                  <Link
                    href="/theater"
                    className="text-xs text-muted-foreground hover:text-primary transition-colors text-center py-1"
                  >
                    +{upcomingSchedules.length - 5} more upcoming show{upcomingSchedules.length - 5 !== 1 ? "s" : ""} →
                  </Link>
                )}
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
