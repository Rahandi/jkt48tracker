import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { formatDate, calcAge } from "@/lib/utils";

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
  const res = await fetch(
    `${process.env.BACKEND_URL}/api/members/${jkt48_id}`,
    { next: { revalidate: 3600 } }
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to fetch member");
  return res.json();
}

async function getAllSchedules(): Promise<TheaterSchedule[]> {
  const res = await fetch(`${process.env.BACKEND_URL}/api/theater-schedules/`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) return [];
  return res.json();
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
  const [member, allSchedules] = await Promise.all([
    getMember(jkt48_id),
    getAllSchedules(),
  ]);
  if (!member) notFound();

  const age = calcAge(member.dob);
  const upcomingShows = allSchedules.filter((s) =>
    s.members.some((m) => m.jkt48_id === jkt48_id)
  );

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-sm px-6 py-4 flex items-center gap-4">
        <Link
          href="/members"
          className="text-muted-foreground hover:text-foreground transition-colors text-sm flex items-center gap-1.5"
        >
          ← All Members
        </Link>
        <span className="text-border">|</span>
        <span className="text-foreground font-medium text-sm">{member.name}</span>
      </header>

      <main className="px-4 py-8 sm:px-6 max-w-3xl mx-auto">
        <div className="flex flex-col sm:flex-row gap-8">
          {/* Photo */}
          <div className="shrink-0 mx-auto sm:mx-0">
            <div className="w-52 rounded-2xl overflow-hidden bg-muted ring-1 ring-border">
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
              <div className="flex gap-2 mt-3 flex-wrap">
                {member.blood_type && (
                  <Badge variant="outline">Blood Type {member.blood_type}</Badge>
                )}
                {member.horoscope && (
                  <Badge variant="secondary">{member.horoscope}</Badge>
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
              <StatRow label="Blood Type" value={member.blood_type} />
              <StatRow label="Horoscope" value={member.horoscope} />
            </div>
          </div>
        </div>

        {/* Upcoming Theater Shows */}
        {upcomingShows.length > 0 && (
          <div className="mt-10">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Upcoming Theater Shows
            </h2>
            <div className="flex flex-col gap-2">
              {upcomingShows.map((s) => (
                <Link
                  key={s.id}
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
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
