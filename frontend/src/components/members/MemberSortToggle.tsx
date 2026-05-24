"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function MemberSortToggle({
  currentSort,
  team,
  q,
  gen,
}: {
  currentSort: string;
  team: string;
  q: string;
  gen: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const sorted = currentSort === "shows";

  function toggle() {
    const params = new URLSearchParams();
    if (team) params.set("team", team);
    if (q) params.set("q", q);
    if (!sorted) params.set("sort", "shows");
    if (gen) params.set("gen", gen);
    startTransition(() => {
      router.push(`/members${params.size ? `?${params}` : ""}`);
    });
  }

  return (
    <button
      onClick={toggle}
      className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors whitespace-nowrap ${
        sorted
          ? "bg-primary text-primary-foreground border-transparent"
          : "bg-secondary text-secondary-foreground hover:bg-secondary/70 border-transparent"
      }`}
    >
      Sort: {sorted ? "Show Count" : "Default"}
    </button>
  );
}
