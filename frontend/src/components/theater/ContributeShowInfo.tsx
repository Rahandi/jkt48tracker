"use client";

import { useState } from "react";

interface Props {
  jkt48ScheduleId: string;
}

export function ContributeShowInfo({ jkt48ScheduleId }: Props) {
  const [open, setOpen] = useState(false);
  const [setlistName, setSetlistName] = useState("");
  const [showDate, setShowDate] = useState("");
  const [showTime, setShowTime] = useState("");
  const [note, setNote] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: Record<string, string> = {};
    if (setlistName) payload.setlist_name = setlistName;
    if (showDate) payload.show_date = showDate;
    if (showTime) payload.show_time = showTime;
    if (!Object.keys(payload).length) return;

    setState("loading");
    try {
      const res = await fetch("/api/contribute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contribution_type: "show_info",
          jkt48_schedule_id: jkt48ScheduleId,
          payload,
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

  if (state === "success") {
    return (
      <span className="text-xs text-green-600 dark:text-green-400">
        Correction submitted, thank you!
      </span>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
      >
        Suggest a correction
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 space-y-2 rounded-lg border border-border p-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">Suggest a correction</span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Setlist name</label>
          <input
            type="text"
            value={setlistName}
            onChange={(e) => setSetlistName(e.target.value)}
            placeholder="e.g. Pajama Drive"
            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Show date</label>
          <input
            type="date"
            value={showDate}
            onChange={(e) => setShowDate(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Show time</label>
          <input
            type="time"
            value={showTime}
            onChange={(e) => setShowTime(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Note (optional)</label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Source or reason for correction"
          className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {state === "error" && (
        <p className="text-xs text-destructive">{errorMsg}</p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={state === "loading" || (!setlistName && !showDate && !showTime)}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {state === "loading" ? "Submitting…" : "Submit"}
        </button>
      </div>
    </form>
  );
}
