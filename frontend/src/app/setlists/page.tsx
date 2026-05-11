export const dynamic = "force-dynamic";

import { SetlistList } from "@/components/setlists/SetlistList";

async function getSetlists(): Promise<{ setlist_name: string; count: number; first_date: string | null; last_date: string | null }[]> {
  if (!process.env.BACKEND_URL) return [];
  const res = await fetch(
    `${process.env.BACKEND_URL}/api/theater-schedules/stats/setlists`,
    { next: { revalidate: 3600 } }
  );
  if (!res.ok) return [];
  return res.json();
}

export default async function SetlistsPage() {
  const setlists = await getSetlists();
  const maxCount = setlists[0]?.count ?? 1;

  return (
    <div className="min-h-screen">
      <main className="px-4 py-6 sm:px-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Setlists</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {setlists.length} unique setlists · {setlists.reduce((s, l) => s + l.count, 0).toLocaleString()} total shows
            </p>
          </div>
        </div>

        <SetlistList setlists={setlists} maxCount={maxCount} />
      </main>
    </div>
  );
}
