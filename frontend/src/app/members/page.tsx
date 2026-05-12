export const dynamic = "force-dynamic";

import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MembersByShowCountChart } from "@/components/charts/MembersByShowCountChart";
import { MemberSearch } from "@/components/members/MemberSearch";
import { getTeamColor, TEAM_COLORS } from "@/lib/teamColors";

const TEAMS = [
  { key: "", label: "All" },
  { key: "love", label: "Team Love" },
  { key: "dream", label: "Team Dream" },
  { key: "passion", label: "Team Passion" },
  { key: "trainee", label: "Trainee" },
  { key: "jkt48_virtual", label: "JKT48 Virtual" },
];

type Member = {
  id: number;
  jkt48_id: string;
  name: string;
  nickname: string | null;
  image_url: string | null;
  blood_type: string | null;
  horoscope: string | null;
  team: string | null;
};

type MemberStat = { jkt48_id: string | null; name: string; show_count: number };

async function getMembers(team?: string): Promise<Member[]> {
  if (!process.env.BACKEND_URL) return [];
  const params = team ? `?team=${team}` : "";
  const res = await fetch(`${process.env.BACKEND_URL}/api/members/${params}`, {
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

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ team?: string; q?: string }>;
}) {
  const { team = "", q = "" } = await searchParams;
  const [members, allStats] = await Promise.all([
    getMembers(team || undefined),
    getMemberStats(),
  ]);

  const memberIdSet = new Set(members.map((m) => m.jkt48_id));
  const activeStats = allStats
    .filter((s) => s.jkt48_id && memberIdSet.has(s.jkt48_id))
    .slice(0, 10);
  const showCountMap = new Map(allStats.map((s) => [s.jkt48_id, s.show_count]));

  const filtered = q
    ? members.filter(
        (m) =>
          m.name.toLowerCase().includes(q.toLowerCase()) ||
          (m.nickname?.toLowerCase().includes(q.toLowerCase()) ?? false)
      )
    : members;

  return (
    <div className="min-h-screen">
      <main className="px-4 py-6 sm:px-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">Members</h1>
          <span className="text-sm text-muted-foreground">
            {filtered.length}{" "}
            {team ? TEAMS.find((t) => t.key === team)?.label : "total"}
          </span>
        </div>

        {/* Team tabs */}
        <div className="flex gap-2 flex-wrap mb-4">
          {TEAMS.map((t) => {
            const active = team === t.key;
            const color = t.key ? TEAM_COLORS[t.key.toUpperCase()] : null;
            return (
              <Link
                key={t.key}
                href={t.key ? `/members?team=${t.key}` : "/members"}
                style={
                  active && color
                    ? { backgroundColor: color.bg, color: color.text, borderColor: color.hex + "60" }
                    : active
                    ? undefined
                    : undefined
                }
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
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

        {/* Search */}
        <MemberSearch defaultValue={q} team={team} />

        {/* Chart — hidden only when searching */}
        {!q && activeStats.length > 0 && (
          <div className="mb-8 mt-6">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              {team
                ? `${TEAMS.find((t) => t.key === team)?.label} — by Show Count`
                : "Top Active Members by Show Count"}
            </h2>
            <Card>
              <CardContent className="py-4 px-4">
                <MembersByShowCountChart data={activeStats} />
              </CardContent>
            </Card>
            <p className="text-xs text-muted-foreground mt-2">
              * Counts based on shows with recorded member data. Some older shows are missing records.{" "}
              <a href="/contribute" className="underline underline-offset-2 hover:text-foreground transition-colors">
                Help complete the data.
              </a>
            </p>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground">No members found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-9 gap-3 mt-6">
            {filtered.map((member) => {
              const teamColor = getTeamColor(member.team);
              return (
              <Link key={member.jkt48_id} href={`/members/${member.jkt48_id}`}>
                <Card className="group hover:ring-2 hover:ring-primary/60 transition-all duration-200 cursor-pointer overflow-hidden gap-0 py-0 rounded-xl">
                  {teamColor && (
                    <div className="h-0.5 w-full" style={{ backgroundColor: teamColor.hex }} />
                  )}
                  <div className="aspect-[3/4] overflow-hidden bg-muted">
                    {member.image_url ? (
                      <Image
                        src={member.image_url}
                        alt={member.name}
                        width={180}
                        height={240}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-muted-foreground text-2xl">?</span>
                      </div>
                    )}
                  </div>
                  <CardContent className="p-2">
                    <p className="font-semibold text-[11px] leading-tight truncate text-foreground">
                      {member.name}
                    </p>
                    {member.nickname && (
                      <p className="text-muted-foreground text-[10px] mt-0.5">
                        {member.nickname}
                      </p>
                    )}
                    <div className="flex gap-1 mt-1 flex-wrap items-center">
                      {member.blood_type && (
                        <Badge
                          variant="outline"
                          className="text-[9px] h-3.5 px-1 rounded-full border-border"
                        >
                          {member.blood_type}
                        </Badge>
                      )}
                      {showCountMap.has(member.jkt48_id) && (
                        <Badge
                          variant="secondary"
                          className="text-[9px] h-3.5 px-1 rounded-full"
                        >
                          {showCountMap.get(member.jkt48_id)}×
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
