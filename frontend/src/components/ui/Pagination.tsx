"use client";

import { useRouter } from "next/navigation";

export function Pagination({
  page,
  total,
  perPage,
  basePath,
  extraParams = "",
}: {
  page: number;
  total: number;
  perPage: number;
  basePath: string;
  extraParams?: string;
}) {
  const router = useRouter();
  const totalPages = Math.ceil(total / perPage);
  if (totalPages <= 1) return null;

  const go = (p: number) => router.push(`${basePath}?${extraParams}&page=${p}`);

  return (
    <div className="flex items-center justify-between mt-6">
      <button
        onClick={() => go(page - 1)}
        disabled={page <= 1}
        className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        ← Previous
      </button>
      <span className="text-xs text-muted-foreground">
        Page {page} of {totalPages} · {total} shows
      </span>
      <button
        onClick={() => go(page + 1)}
        disabled={page >= totalPages}
        className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        Next →
      </button>
    </div>
  );
}
