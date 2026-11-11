import Link from "next/link";
import { notFound } from "next/navigation";
import tracklists from "@/data/setlist-tracklists.json";
import songLyrics from "@/data/song-lyrics.json";
import idTitlesRaw from "@/data/song-id-titles.json";

type TracklistData = Record<string, { wiki_page: string; songs: { track: string; name: string }[] }>;
type LyricsData = Record<string, { source: string; lyrics: string }>;

async function getSetlistCounts(): Promise<Record<string, number>> {
  if (!(process.env.BACKEND_URL || "http://localhost:8000")) return {};
  const res = await fetch(
    `${(process.env.BACKEND_URL || "http://localhost:8000")}/api/theater-schedules/stats/setlists`,
    { next: { revalidate: 3600 } }
  );
  if (!res.ok) return {};
  const data: { setlist_name: string; count: number }[] = await res.json();
  return Object.fromEntries(data.map((d) => [d.setlist_name, d.count]));
}

type Appearance = {
  setlistName: string;
  track: string;
  showCount: number;
  isEncore: boolean;
};

function getSongAppearances(songName: string, counts: Record<string, number>): Appearance[] {
  const data = tracklists as TracklistData;
  const appearances: Appearance[] = [];

  for (const [setlistName, count] of Object.entries(counts)) {
    const entry = data[setlistName];
    if (!entry) continue;
    const song = entry.songs.find((s) => s.name === songName);
    if (!song) continue;
    if (!appearances.some((a) => a.setlistName === setlistName)) {
      appearances.push({
        setlistName,
        track: song.track,
        showCount: count,
        isEncore: song.track.startsWith("EN"),
      });
    }
  }

  return appearances.sort((a, b) => b.showCount - a.showCount);
}

export async function generateStaticParams() {
  const res = await fetch(`${(process.env.BACKEND_URL || "http://localhost:8000")}/api/theater-schedules/stats/setlists`);
  const all: { setlist_name: string }[] = res.ok ? await res.json() : [];
  const data = tracklists as TracklistData;
  const names = new Set<string>();
  for (const { setlist_name } of all) {
    for (const song of data[setlist_name]?.songs ?? []) {
      if (!song.name.toLowerCase().includes("overture")) names.add(song.name);
    }
  }
  return [...names].map((name) => ({ name }));
}

export default async function SongDetailPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name: encodedName } = await params;
  const songName = decodeURIComponent(encodedName);

  const counts = await getSetlistCounts();
  const appearances = getSongAppearances(songName, counts);

  if (appearances.length === 0) notFound();

  const lyricsEntry = (songLyrics as LyricsData)[songName];
  const idTitle = (idTitlesRaw as Record<string, string | null>)[songName] ?? null;
  const displayTitle = idTitle ? `${idTitle} (${songName})` : songName;

  const totalShows = appearances.reduce((s, a) => s + a.showCount, 0);

  return (
    <div className="min-h-screen">
      <main className="px-4 py-8 sm:px-6 max-w-3xl mx-auto">
        <Link
          href="/songs"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          ← Songs
        </Link>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          <h1 className="text-3xl font-bold text-foreground leading-tight">{displayTitle}</h1>
          <div className="flex gap-6 shrink-0">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">{totalShows.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Total shows</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-foreground">{appearances.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Setlists</p>
            </div>
          </div>
        </div>

        {/* Appearances */}
        {appearances.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Setlist
            </h2>
            <AppearanceList appearances={appearances} />
          </div>
        )}

        {lyricsEntry && (
          <div className="mt-10 pt-8 border-t border-border/60">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-5">
              Lyrics
            </h2>
            <div className="text-sm text-foreground/80 leading-relaxed space-y-4">
              {lyricsEntry.lyrics.split("\n\n").map((stanza, i) => (
                <p key={i} className="whitespace-pre-line">
                  {stanza}
                </p>
              ))}
            </div>
            <a
              href={lyricsEntry.source}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Source ↗
            </a>
          </div>
        )}
      </main>
    </div>
  );
}

function AppearanceList({ appearances }: { appearances: Appearance[] }) {
  return (
    <div className="flex flex-col divide-y divide-border/60">
      {appearances.map((a) => (
        <Link
          key={a.setlistName}
          href={`/setlists/${encodeURIComponent(a.setlistName)}`}
          className="flex items-center justify-between gap-4 py-3 px-1 hover:bg-secondary/40 rounded-lg transition-colors group"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-[10px] font-mono text-muted-foreground/70 w-9 shrink-0 text-right">
              {a.track}
            </span>
            <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
              {a.setlistName}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-sm text-muted-foreground tabular-nums">
              {a.showCount.toLocaleString()}×
            </span>
            <span className="text-muted-foreground text-sm">→</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
