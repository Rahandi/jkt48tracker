import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

type ScheduleMember = { id: number; name: string; jkt48_id: string | null };

type TheaterSchedule = {
  id: number;
  jkt48_schedule_id: string;
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
};

type MemberStat = {
  jkt48_id: string | null;
  name: string;
  show_count: number;
};

async function getSchedules(): Promise<TheaterSchedule[]> {
  const res = await fetch(`${process.env.BACKEND_URL}/api/theater-schedules/`, {
    next: { revalidate: 3600 },
  });
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

function computeMemberStats(schedules: TheaterSchedule[]): MemberStat[] {
  const map = new Map<string, MemberStat>();
  for (const s of schedules) {
    for (const m of s.members) {
      const key = m.jkt48_id ?? m.name;
      const existing = map.get(key);
      if (existing) {
        existing.show_count++;
      } else {
        map.set(key, { jkt48_id: m.jkt48_id, name: m.name, show_count: 1 });
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => b.show_count - a.show_count);
}

export default async function TheaterPage() {
  const [schedules, members] = await Promise.all([getSchedules(), getMembers()]);
  const memberMap = new Map(members.map((m) => [m.jkt48_id, m]));
  const memberStats = computeMemberStats(schedules);
  const uniqueSetlists = new Set(
    schedules.map((s) => s.setlist_name).filter(Boolean)
  ).size;
  const maxCount = memberStats[0]?.show_count ?? 1;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-sm px-6 py-4 flex items-center gap-4">
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground transition-colors text-sm"
        >
          ← Members
        </Link>
        <span className="text-border">|</span>
        <span className="text-primary font-bold text-sm">Theater Schedule</span>
      </header>

      <main className="px-4 py-6 sm:px-6 max-w-7xl mx-auto">
        {/* Summary stat cards */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { value: schedules.length, label: "Upcoming Shows" },
            { value: memberStats.length, label: "Members Active" },
            { value: uniqueSetlists, label: "Setlists" },
          ].map(({ value, label }) => (
            <Card key={label} size="sm">
              <CardContent className="py-5 text-center">
                <p className="text-3xl font-bold text-primary">{value}</p>
                <p className="text-muted-foreground text-xs mt-1">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-[1fr_300px] gap-6">
          {/* Upcoming Shows list */}
          <section>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Upcoming Shows
            </h2>
            <div className="flex flex-col gap-3">
              {schedules.length === 0 ? (
                <p className="text-muted-foreground text-sm">No shows scheduled.</p>
              ) : (
                schedules.map((s) => (
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
                ))
              )}
            </div>
          </section>

          {/* Member Leaderboard */}
          <aside>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Member Appearances
            </h2>
            <Card>
              <CardContent className="py-1 divide-y divide-border">
                {memberStats.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-6 text-center">
                    No data yet.
                  </p>
                ) : (
                  memberStats.slice(0, 25).map((ms, i) => {
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
                              className="h-full bg-primary rounded-full transition-all"
                              style={{
                                width: `${(ms.show_count / maxCount) * 100}%`,
                              }}
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
