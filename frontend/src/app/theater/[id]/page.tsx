import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDate } from "@/lib/utils";

type ScheduleMember = { id: number; name: string; jkt48_id: string | null };

type TheaterSchedule = {
  id: number;
  jkt48_schedule_id: string;
  show_date: string | null;
  show_time: string | null;
  setlist_name: string | null;
  members: ScheduleMember[];
};

type Member = {
  id: number;
  jkt48_id: string;
  name: string;
  image_url: string | null;
};

async function getSchedule(id: string): Promise<TheaterSchedule | null> {
  const res = await fetch(
    `${process.env.BACKEND_URL}/api/theater-schedules/${id}`,
    { next: { revalidate: 3600 } }
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to fetch schedule");
  return res.json();
}

async function getMembers(): Promise<Member[]> {
  const res = await fetch(`${process.env.BACKEND_URL}/api/members/`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) return [];
  return res.json();
}

export default async function TheaterShowPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [schedule, members] = await Promise.all([getSchedule(id), getMembers()]);
  if (!schedule) notFound();

  const memberMap = new Map(members.map((m) => [m.jkt48_id, m]));

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-sm px-6 py-4 flex items-center gap-4">
        <Link
          href="/theater"
          className="text-muted-foreground hover:text-foreground transition-colors text-sm"
        >
          ← Theater
        </Link>
        <span className="text-border">|</span>
        <span className="text-foreground font-medium text-sm truncate">
          {schedule.setlist_name ?? "Show Detail"}
        </span>
      </header>

      <main className="px-4 py-8 sm:px-6 max-w-4xl mx-auto">
        {/* Show info */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground leading-tight">
            {schedule.setlist_name ?? "TBA"}
          </h1>
          <p className="text-muted-foreground mt-2 text-base">
            {schedule.show_date ? formatDate(schedule.show_date) : "Date TBA"}
            {schedule.show_time && (
              <span className="ml-2">· {schedule.show_time} WIB</span>
            )}
          </p>
          <p className="text-muted-foreground text-sm mt-1">
            {schedule.members.length} performing members
          </p>
        </div>

        {/* Member grid */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Performing Members
          </h2>

          {schedule.members.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Member list not available yet.
            </p>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
              {schedule.members.map((m) => {
                const info = m.jkt48_id ? memberMap.get(m.jkt48_id) : undefined;

                const card = (
                  <div className="group text-center">
                    <div className="aspect-[3/4] rounded-xl overflow-hidden bg-muted ring-1 ring-border group-hover:ring-primary/60 transition-all duration-200">
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
                    </div>
                    <p className="text-[10px] font-medium text-foreground mt-1.5 leading-tight truncate">
                      {m.name}
                    </p>
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
      </main>
    </div>
  );
}
