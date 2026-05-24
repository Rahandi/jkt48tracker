"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";

type Member = {
  id: number;
  jkt48_id: string;
  name: string;
  image_url: string | null;
};

type MemberStat = { jkt48_id: string | null; name: string; show_count: number };

export function TopPerformers({
  memberStats,
  memberMap,
}: {
  memberStats: MemberStat[];
  memberMap: Map<string, Member>;
}) {
  const [showAll, setShowAll] = useState(false);

  const filtered = showAll
    ? memberStats
    : memberStats.filter((ms) => ms.jkt48_id && memberMap.has(ms.jkt48_id));

  const maxCount = filtered[0]?.show_count ?? 1;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Top Performers
        </h2>
        <Link
          href="/members"
          className="text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          View all →
        </Link>
      </div>

      <div className="flex gap-1 bg-secondary rounded-lg p-1 w-fit mb-3">
        <button
          onClick={() => setShowAll(false)}
          className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
            !showAll
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Active
        </button>
        <button
          onClick={() => setShowAll(true)}
          className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
            showAll
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          All-time
        </button>
      </div>

      <Card>
        <CardContent className="py-1">
          {filtered.length === 0 ? (
            <p className="text-muted-foreground text-sm py-6 text-center">
              No data yet.
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 sm:grid-flow-col sm:grid-rows-[repeat(15,auto)] lg:grid-cols-3 lg:grid-rows-[repeat(10,auto)] sm:gap-x-8">
            {filtered.slice(0, 30).map((ms, i) => {
              const info = ms.jkt48_id ? memberMap.get(ms.jkt48_id) : undefined;
              const isGraduated = !ms.jkt48_id || !memberMap.has(ms.jkt48_id);
              return (
                <div
                  key={ms.jkt48_id ?? ms.name}
                  className="flex items-center gap-3 py-2.5 border-b border-border last:border-0"
                >
                  <span className="text-muted-foreground text-xs w-5 text-right shrink-0">
                    {i + 1}
                  </span>
                  {info?.image_url ? (
                    <Image
                      src={info.image_url}
                      alt={ms.name}
                      width={32}
                      height={32}
                      className="w-8 h-8 rounded-full object-cover object-[center_25%] shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-muted shrink-0 flex items-center justify-center">
                      <span className="text-[10px] text-muted-foreground font-semibold">
                        {ms.name[0]}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {ms.jkt48_id && !isGraduated ? (
                        <Link
                          href={`/members/${ms.jkt48_id}`}
                          className="text-sm font-medium text-foreground hover:text-primary transition-colors truncate"
                        >
                          {ms.name}
                        </Link>
                      ) : (
                        <span className="text-sm font-medium text-muted-foreground truncate">
                          {ms.name}
                        </span>
                      )}
                      {isGraduated && (
                        <span className="text-[10px] text-muted-foreground bg-muted rounded px-1 py-0.5 shrink-0">
                          grad
                        </span>
                      )}
                    </div>
                    <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${(ms.show_count / maxCount) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 w-8 text-right">
                    {ms.show_count}×
                  </span>
                </div>
              );
            })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
