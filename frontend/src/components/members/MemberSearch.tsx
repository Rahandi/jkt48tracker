"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function MemberSearch({
  defaultValue,
  team,
  sort,
  gen,
}: {
  defaultValue: string;
  team: string;
  sort: string;
  gen: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    const params = new URLSearchParams();
    if (team) params.set("team", team);
    if (q) params.set("q", q);
    if (sort) params.set("sort", sort);
    if (gen) params.set("gen", gen);
    startTransition(() => {
      router.push(`/members${params.size ? `?${params}` : ""}`);
    });
  }

  return (
    <input
      type="search"
      placeholder="Search members…"
      defaultValue={defaultValue}
      onChange={handleChange}
      className="w-full max-w-sm px-3 py-2 rounded-lg bg-secondary text-foreground text-sm placeholder:text-muted-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary/50"
    />
  );
}
