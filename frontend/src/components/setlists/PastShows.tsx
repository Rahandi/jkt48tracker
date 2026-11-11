"use client";

import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { formatDate } from "@/lib/utils";

const PER_PAGE = 50;

export type SlimShow = {
  id: number;
  show_date: string | null;
  show_time: string | null;
  member_count: number;
  seitansai_members: string | null;
  members: { name: string; image_url: string | null }[];
};

export function PastShows({ shows, encodedName, total }: { shows: SlimShow[]; encodedName: string; total: number }) {
  const sp = useSearchParams();
  const page = Math.max(1, parseInt(sp.get("page") ?? "1") || 1);
  const offset = (page - 1) * PER_PAGE;
  const totalPages = Math.ceil(total / PER_PAGE);
  const info = { count: total };
  const pageShows = shows.slice(offset, offset + PER_PAGE);
  const byYear = pageShows.reduce<Record<string, SlimShow[]>>((acc, s) => {
    const y = s.show_date ? s.show_date.slice(0, 4) : "Unknown";
    (acc[y] ??= []).push(s);
    return acc;
  }, {});

  return (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              All Performances
            </h2>
            <span className="text-xs text-muted-foreground">
              {offset + 1}–{Math.min(offset + PER_PAGE, info.count)} of {info.count}
            </span>
          </div>

          <div className="flex flex-col gap-6">
            {Object.entries(byYear)
              .sort(([a], [b]) => Number(b) - Number(a))
              .map(([year, yearShows]) => (
                <div key={year}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs font-bold text-primary uppercase tracking-widest">
                      {year}
                    </span>
                    <span className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground">{yearShows.length} shows</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {yearShows.map((s) => (
                      <ShowRow key={s.id} s={s} />
                    ))}
                  </div>
                </div>
              ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              {page > 1 && (
                <Link
                  href={`/setlists/${encodedName}?page=${page - 1}`}
                  className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm hover:bg-secondary/70 transition-colors"
                >
                  ← Prev
                </Link>
              )}
              <span className="text-sm text-muted-foreground px-3">
                Page {page} of {totalPages}
              </span>
              {page < totalPages && (
                <Link
                  href={`/setlists/${encodedName}?page=${page + 1}`}
                  className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm hover:bg-secondary/70 transition-colors"
                >
                  Next →
                </Link>
              )}
            </div>
          )}
        </div>
  );
}

export function ShowRow({ s }: { s: SlimShow }) {
  return (
    <Link
      href={`/theater/${s.id}`}
      className="flex items-center gap-4 px-4 py-3 rounded-xl bg-card ring-1 ring-border hover:ring-primary/60 transition-all duration-200"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm text-foreground font-medium">
            {s.show_date ? formatDate(s.show_date) : "Date TBA"}
            {s.show_time && (
              <span className="text-muted-foreground ml-2">· {s.show_time} WIB</span>
            )}
          </p>
          {s.seitansai_members && (
            <span className="text-xs">🎂 {s.seitansai_members}</span>
          )}
        </div>
        {s.members.length > 0 && (
          <div className="flex -space-x-1.5 mt-2">
            {s.members.slice(0, 12).map((m, i) => {
              return m.image_url ? (
                <Image
                  key={i}
                  src={m.image_url}
                  alt={m.name}
                  width={22}
                  height={22}
                  className="w-5 h-5 rounded-full object-cover object-[center_25%] ring-1 ring-card"
                />
              ) : (
                <div
                  key={i}
                  className="w-5 h-5 rounded-full bg-muted ring-1 ring-card flex items-center justify-center shrink-0"
                >
                  <span className="text-[7px] text-muted-foreground">{m.name[0]}</span>
                </div>
              );
            })}
            {s.member_count > 12 && (
              <span className="text-[10px] text-muted-foreground ml-2 self-center">
                +{s.member_count - 12}
              </span>
            )}
          </div>
        )}
      </div>
      <span className="text-muted-foreground text-sm shrink-0">→</span>
    </Link>
  );
}
