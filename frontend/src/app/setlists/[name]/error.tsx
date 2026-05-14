"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <p className="text-muted-foreground">Something went wrong loading this setlist.</p>
      <button
        onClick={reset}
        className="text-sm underline underline-offset-4 hover:text-foreground transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
