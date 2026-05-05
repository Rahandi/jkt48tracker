import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

type Member = {
  id: number;
  jkt48_id: string;
  name: string;
  nickname: string | null;
  image_url: string | null;
  blood_type: string | null;
  horoscope: string | null;
};

async function getMembers(): Promise<Member[]> {
  const res = await fetch(`${process.env.BACKEND_URL}/api/members/`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error("Failed to fetch members");
  return res.json();
}

export default async function HomePage() {
  const members = await getMembers();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-sm px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-primary font-bold text-xl">JKT48</span>
          <span className="text-foreground font-semibold text-xl">Tracker</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/theater"
            className="text-muted-foreground hover:text-foreground transition-colors text-sm"
          >
            Theater
          </Link>
          <span className="text-muted-foreground text-sm">{members.length} members</span>
        </div>
      </header>

      <main className="px-4 py-6 sm:px-6">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-9 gap-3">
          {members.map((member) => (
            <Link key={member.jkt48_id} href={`/members/${member.jkt48_id}`}>
              <Card className="group hover:ring-2 hover:ring-primary/60 transition-all duration-200 cursor-pointer overflow-hidden gap-0 py-0 rounded-xl">
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
                    <p className="text-muted-foreground text-[10px] mt-0.5">{member.nickname}</p>
                  )}
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {member.blood_type && (
                      <Badge variant="outline" className="text-[9px] h-3.5 px-1 rounded-full border-border">
                        {member.blood_type}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
