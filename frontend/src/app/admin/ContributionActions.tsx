"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  contributionId: number;
}

export function ContributionActions({ contributionId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [error, setError] = useState("");

  async function act(action: "approve" | "reject") {
    setLoading(action);
    setError("");
    try {
      const res = await fetch("/api/admin/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contributionId,
          action,
          reason: action === "reject" ? rejectReason : undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail ?? "Action failed");
      }
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error");
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-xs text-destructive">{error}</p>}
      {showReject ? (
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Reason (optional)"
            className="flex-1 rounded border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            onClick={() => act("reject")}
            disabled={loading !== null}
            className="rounded bg-destructive px-3 py-1 text-xs font-medium text-destructive-foreground hover:bg-destructive/80 disabled:opacity-50"
          >
            {loading === "reject" ? "…" : "Confirm"}
          </button>
          <button
            onClick={() => setShowReject(false)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={() => act("approve")}
            disabled={loading !== null}
            className="rounded bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-500 disabled:opacity-50"
          >
            {loading === "approve" ? "…" : "Approve"}
          </button>
          <button
            onClick={() => setShowReject(true)}
            disabled={loading !== null}
            className="rounded border border-border px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            Reject
          </button>
        </div>
      )}
    </div>
  );
}
