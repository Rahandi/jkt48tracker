
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
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

type Show = {
  id: number;
  kind: "past" | "upcoming" | "ongoing";
  show_date: string | null;
  show_time: string | null;
  setlist_name: string | null;
  member_count: number;
  team: string | null;
  teams: string[];
  members: { name: string; image_url: string | null }[];
};

type Data = { shows: Show[]; topSetlists: { setlist_name: string; count: number }[] };

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

function ShowRow({ s }: { s: Show }) {
  const team = s.team;
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
                  return m.image_url ? (
                    <Image
                      key={i}
                      src={m.image_url}
                      alt={m.name}
                      width={28}
                      height={28}
                      className="w-7 h-7 rounded-full object-cover object-[center_25%] ring-2 ring-card"
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

export function TheaterView() {
  const sp = useSearchParams();
  const tab = sp.get("tab") ?? "upcoming";
  const team = sp.get("team") ?? "";
  const pageStr = sp.get("page") ?? "1";
  const isPast = tab === "past";
  const page = Math.max(1, parseInt(pageStr) || 1);
  const offset = (page - 1) * PER_PAGE;

  const [data, setData] = useState<Data | null>(null);
  useEffect(() => {
    fetch(`${BASE_PATH}/data/theater-list.json`).then((r) => r.json()).then(setData);
  }, []);
  if (!data) return <div className="min-h-screen"><main className="px-4 py-6 sm:px-6 max-w-7xl mx-auto text-sm text-muted-foreground">Loading…</main></div>;

  const inTeam = (s: Show) => !team || s.teams.includes(team.toUpperCase());
  const ongoingSchedules = data.shows.filter((s) => s.kind === "ongoing");
  const upcomingAll = data.shows.filter((s) => s.kind === "upcoming");
  const pastAll = data.shows.filter((s) => s.kind === "past");
  const upcomingCount = upcomingAll.length;
  const pastCount = pastAll.length;
  const filtered = (isPast ? pastAll : upcomingAll).filter(inTeam);
  const total = filtered.length;
  const schedules = isPast ? filtered.slice(offset, offset + PER_PAGE) : filtered;
  const topSetlists = data.topSetlists;
  const baseHref = `/theater?tab=${tab}`;

  return (
    <div className="min-h-screen">
      <main className="px-4 py-6 sm:px-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">Theater Schedule</h1>
          <span className="text-sm text-muted-foreground">{total.toLocaleString()} shows</span>
        </div>

        {ongoingSchedules.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
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
                <ShowRow key={s.id} s={s} />
              ))}
            </div>
          </div>
        )}

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
                const byYear = schedules.reduce<Record<string, Show[]>>((acc, s) => {
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
                              <ShowRow key={s.id} s={s} />
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
                  <ShowRow key={s.id} s={s} />
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
