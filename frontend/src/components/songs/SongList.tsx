"use client";

import Link from "next/link";
import { useState, useMemo } from "react";

export type SongEntry = {
  name: string;
  setlists: { setlistName: string; track: string; showCount: number }[];
  totalShows: number;
};

export function SongList({
  songs,
  idTitles = {},
}: {
  songs: SongEntry[];
  idTitles?: Record<string, string | null>;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return songs;
    return songs.filter((s) => {
      const id = idTitles[s.name];
      return (
        s.name.toLowerCase().includes(q) ||
        (id && id.toLowerCase().includes(q))
      );
    });
  }, [songs, query, idTitles]);

  return (
    <div>
      <input
        type="text"
        placeholder="Search songs…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 mb-6"
      />

      <div className="text-xs text-muted-foreground mb-3">
        {filtered.length} song{filtered.length !== 1 ? "s" : ""}
        {query && ` matching "${query}"`}
      </div>

      <div className="flex flex-col divide-y divide-border/60">
        {filtered.map((song) => {
          const idTitle = idTitles[song.name] ?? null;
          return (
          <Link
            key={song.name}
            href={`/songs/${encodeURIComponent(song.name)}`}
            className="flex items-center justify-between gap-4 py-3 px-1 hover:bg-secondary/40 rounded-lg transition-colors group"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
                {idTitle ? `${idTitle} (${song.name})` : song.name}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {song.setlists.length} setlist{song.setlists.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-sm font-semibold text-foreground tabular-nums">
                {song.totalShows.toLocaleString()}×
              </span>
              <span className="text-muted-foreground text-sm">→</span>
            </div>
          </Link>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="text-muted-foreground text-sm text-center py-12">No songs found.</p>
      )}
    </div>
  );
}
