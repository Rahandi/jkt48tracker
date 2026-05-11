"use client";

import Link from "next/link";
import { useState, useMemo } from "react";

export type SetlistEntry = {
  setlist_name: string;
  count: number;
  first_date: string | null;
  last_date: string | null;
};

function yearRange(s: SetlistEntry): string | null {
  const first = s.first_date?.slice(0, 4) ?? null;
  const last = s.last_date?.slice(0, 4) ?? null;
  if (!first) return null;
  return first === last ? first : `${first}–${last}`;
}

export function SetlistList({ setlists, maxCount }: { setlists: SetlistEntry[]; maxCount: number }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return setlists;
    return setlists.filter((s) => s.setlist_name.toLowerCase().includes(q));
  }, [setlists, query]);

  return (
    <div>
      <input
        type="text"
        placeholder="Search setlists…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 mb-4"
      />

      {query && (
        <p className="text-xs text-muted-foreground mb-3">
          {filtered.length} setlist{filtered.length !== 1 ? "s" : ""} matching &ldquo;{query}&rdquo;
        </p>
      )}

      <div className="border border-border rounded-xl overflow-hidden">
        {filtered.map((s, i) => (
          <Link
            key={s.setlist_name}
            href={`/setlists/${encodeURIComponent(s.setlist_name)}`}
            className="flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/50 transition-colors border-b border-border last:border-0 group"
          >
            <span className="text-muted-foreground text-xs w-5 text-right shrink-0 tabular-nums">
              {i + 1}
            </span>

            <div className="flex-1 min-w-0 flex items-center gap-2">
              <div
                className="h-1 rounded-full bg-primary shrink-0"
                style={{ width: `${Math.max(4, (s.count / maxCount) * 48)}px` }}
              />
              <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                {s.setlist_name}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {yearRange(s) && (
                <span className="text-[11px] text-muted-foreground hidden sm:block">{yearRange(s)}</span>
              )}
              <span className="text-xs font-semibold text-primary tabular-nums w-10 text-right">
                {s.count}×
              </span>
            </div>
          </Link>
        ))}

        {filtered.length === 0 && (
          <p className="text-muted-foreground text-sm text-center py-12">No setlists found.</p>
        )}
      </div>
    </div>
  );
}
