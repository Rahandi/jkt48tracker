import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

type Member = {
  id: number;
  jkt48_id: string;
  name: string;
  nickname: string | null;
  image_url: string | null;
  blood_type: string | null;
  horoscope: string | null;
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

async function getMembers(): Promise<Member[]> {
  const res = await fetch(`${process.env.BACKEND_URL}/api/members/`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) return [];
  return res.json();
}

async function getSchedules(): Promise<TheaterSchedule[]> {
  const res = await fetch(`${process.env.BACKEND_URL}/api/theater-schedules/`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) return [];
  return res.json();
}

type MemberStat = { jkt48_id: string | null; name: string; show_count: number };

function computeMemberStats(schedules: TheaterSchedule[]): MemberStat[] {
  const map = new Map<string, MemberStat>();
  for (const s of schedules) {
    for (const m of s.members) {
      const key = m.jkt48_id ?? m.name;
      const entry = map.get(key);
      if (entry) {
        entry.show_count++;
      } else {
        map.set(key, { jkt48_id: m.jkt48_id, name: m.name, show_count: 1 });
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => b.show_count - a.show_count);
}

export default async function HomePage() {
  const [members, schedules] = await Promise.all([getMembers(), getSchedules()]);

  const memberMap = new Map(members.map((m) => [m.jkt48_id, m]));
  const memberStats = computeMemberStats(schedules);
  const activeInTheater = new Set(
    schedules.flatMap((s) => s.members.map((m) => m.jkt48_id).filter(Boolean))
  ).size;
  const uniqueSetlists = new Set(
    schedules.map((s) => s.setlist_name).filter(Boolean)
  ).size;
  const maxCount = memberStats[0]?.show_count ?? 1;

  const summaryStats = [
    { value: members.length, label: "Members", href: "/members" },
    { value: schedules.length, label: "Upcoming Shows", href: "/theater" },
    { value: activeInTheater, label: "Active in Theater", href: "/theater" },
    { value: uniqueSetlists, label: "Setlists", href: "/theater" },
  ];

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-sm px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-primary font-bold text-xl">JKT48</span>
          <span className="text-foreground font-semibold text-xl">Tracker</span>
        </div>
        <nav className="flex items-center gap-5">
          <Link
            href="/members"
            className="text-muted-foreground hover:text-foreground transition-colors text-sm"
          >
            Members
          </Link>
          <Link
            href="/theater"
            className="text-muted-foreground hover:text-foreground transition-colors text-sm"
          >
            Theater
          </Link>
        </nav>
      </header>

      <main className="px-4 py-8 sm:px-6 max-w-7xl mx-auto">
        {/* Hero stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
          {summaryStats.map(({ value, label, href }) => (
            <Link key={label} href={href}>
              <Card className="hover:ring-2 hover:ring-primary/40 transition-all duration-200 cursor-pointer">
                <CardContent className="py-6 text-center">
                  <p className="text-4xl font-bold text-primary">{value}</p>
                  <p className="text-muted-foreground text-xs mt-1.5">{label}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="grid lg:grid-cols-[1fr_300px] gap-8">
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

            {schedules.length === 0 ? (
              <p className="text-muted-foreground text-sm">No shows scheduled.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {schedules.slice(0, 5).map((s) => (
                  <Link key={s.id} href={`/theater/${s.id}`}>
                    <Card className="hover:ring-2 hover:ring-primary/60 transition-all duration-200 cursor-pointer">
                      <CardContent className="py-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <h3 className="font-semibold text-foreground text-base leading-tight truncate">
                              {s.setlist_name ?? "TBA"}
                            </h3>
                            <p className="text-muted-foreground text-sm mt-1">
                              {s.show_date ? formatDate(s.show_date) : "Date TBA"}
                              {s.show_time && (
                                <span className="ml-2">· {s.show_time} WIB</span>
                              )}
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
                                const info = m.jkt48_id
                                  ? memberMap.get(m.jkt48_id)
                                  : undefined;
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
                ))}
              </div>
            )}
          </section>

          {/* Top Performers leaderboard */}
          <aside>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Top Performers
              </h2>
              <Link
                href="/theater"
                className="text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                View all →
              </Link>
            </div>

            <Card>
              <CardContent className="py-1 divide-y divide-border">
                {memberStats.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-6 text-center">
                    No data yet.
                  </p>
                ) : (
                  memberStats.slice(0, 15).map((ms, i) => {
                    const info = ms.jkt48_id ? memberMap.get(ms.jkt48_id) : undefined;
                    return (
                      <div
                        key={ms.jkt48_id ?? ms.name}
                        className="flex items-center gap-3 py-2.5"
                      >
                        <span className="text-muted-foreground text-xs w-5 text-right shrink-0">
                          {i + 1}
                        </span>
                        {info?.image_url ? (
                          <Image
                            src={info.image_url}
                            alt={ms.name}
                            width={32}
                            height={32}
                            className="w-8 h-8 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-muted shrink-0 flex items-center justify-center">
                            <span className="text-[10px] text-muted-foreground font-semibold">
                              {ms.name[0]}
                            </span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          {ms.jkt48_id ? (
                            <Link
                              href={`/members/${ms.jkt48_id}`}
                              className="text-sm font-medium text-foreground hover:text-primary transition-colors truncate block"
                            >
                              {ms.name}
                            </Link>
                          ) : (
                            <span className="text-sm font-medium text-foreground truncate block">
                              {ms.name}
                            </span>
                          )}
                          <div className="mt-1 h-1 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${(ms.show_count / maxCount) * 100}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0 w-8 text-right">
                          {ms.show_count}×
                        </span>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>
    </div>
  );
}
