"use client";

import { useRouter } from "next/navigation";

export function TheaterTabs({
  activeTab,
  upcomingCount,
  pastCount,
}: {
  activeTab: string;
  upcomingCount: number;
  pastCount: number;
}) {
  const router = useRouter();

  const tabs = [
    { key: "upcoming", label: "Upcoming", count: upcomingCount },
    { key: "past", label: "Past", count: pastCount },
  ];

  return (
    <div className="flex gap-1 bg-secondary rounded-lg p-1 w-fit mb-6">
      {tabs.map(({ key, label, count }) => (
        <button
          key={key}
          onClick={() => router.push(`/theater?tab=${key}`)}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
            activeTab === key
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {label}
          <span
            className={`text-xs px-1.5 py-0.5 rounded-full ${
              activeTab === key
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {count.toLocaleString()}
          </span>
        </button>
      ))}
    </div>
  );
}
