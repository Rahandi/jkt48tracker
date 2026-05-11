import { SongList, type SongEntry } from "@/components/songs/SongList";
import tracklists from "@/data/setlist-tracklists.json";
import idTitlesRaw from "@/data/song-id-titles.json";

type TracklistData = Record<string, { wiki_page: string; songs: { track: string; name: string }[] }>;

async function getSetlistCounts(): Promise<Record<string, number>> {
  if (!process.env.BACKEND_URL) return {};
  const res = await fetch(
    `${process.env.BACKEND_URL}/api/theater-schedules/stats/setlists`,
    { next: { revalidate: 3600 } }
  );
  if (!res.ok) return {};
  const data: { setlist_name: string; count: number }[] = await res.json();
  return Object.fromEntries(data.map((d) => [d.setlist_name, d.count]));
}

function buildSongIndex(counts: Record<string, number>): SongEntry[] {
  const data = tracklists as TracklistData;
  const songMap = new Map<string, { setlistName: string; track: string; showCount: number }[]>();

  // Only process setlist names that exist in the DB (have show counts)
  for (const [setlistName, count] of Object.entries(counts)) {
    const entry = data[setlistName];
    if (!entry) continue;
    for (const song of entry.songs) {
      if (song.name.toLowerCase().includes("overture")) continue;
      if (!songMap.has(song.name)) songMap.set(song.name, []);
      const existing = songMap.get(song.name)!;
      if (!existing.some((e) => e.setlistName === setlistName)) {
        existing.push({ setlistName, track: song.track, showCount: count });
      }
    }
  }

  return Array.from(songMap.entries())
    .map(([name, setlists]) => ({
      name,
      setlists,
      totalShows: setlists.reduce((s, e) => s + e.showCount, 0),
    }))
    .sort((a, b) => b.totalShows - a.totalShows);
}

const idTitles = idTitlesRaw as Record<string, string | null>;

export default async function SongsPage() {
  const counts = await getSetlistCounts();
  const songs = buildSongIndex(counts);

  return (
    <div className="min-h-screen">
      <main className="px-4 py-8 sm:px-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">Songs</h1>
          <span className="text-sm text-muted-foreground">{songs.length} songs</span>
        </div>
        <SongList songs={songs} idTitles={idTitles} />
      </main>
    </div>
  );
}
