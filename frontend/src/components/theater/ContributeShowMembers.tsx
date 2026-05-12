"use client";

import { useState } from "react";

interface Props {
  jkt48ScheduleId: string;
}

export function ContributeShowMembers({ jkt48ScheduleId }: Props) {
  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState("");
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const memberList = members
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!memberList.length) return;

    setState("loading");
    try {
      const res = await fetch("/api/contribute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contribution_type: "show_members",
          jkt48_schedule_id: jkt48ScheduleId,
          payload: { members: memberList },
          contributor_name: name || undefined,
          contributor_note: note || undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail ?? "Submission failed");
      }
      setState("success");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
      setState("error");
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-4 text-sm text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors"
      >
        Know who performed? Help complete this show
      </button>
    );
  }

  if (state === "success") {
    return (
      <div className="mt-4 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-400">
        Thank you! Your submission is under review and will appear once approved.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3 rounded-lg border border-border p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Submit member list</p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">
          Member names — one per line
        </label>
        <textarea
          value={members}
          onChange={(e) => setMembers(e.target.value)}
          rows={8}
          required
          placeholder={"Astrella Virgiananda\nBong Aprilli\nCarissa Dini\n..."}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-y"
        />
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Your name (optional)</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Anonymous"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Source / note (optional)</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. YouTube setlist video"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>

      {state === "error" && (
        <p className="text-xs text-destructive">{errorMsg}</p>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Names are matched to member profiles automatically. Submissions are reviewed before going live.
        </p>
        <button
          type="submit"
          disabled={state === "loading"}
          className="shrink-0 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {state === "loading" ? "Submitting…" : "Submit"}
        </button>
      </div>
    </form>
  );
}
