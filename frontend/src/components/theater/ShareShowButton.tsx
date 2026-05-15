"use client";

import { formatDate } from "@/lib/utils";

type Member = { name: string; jkt48_id: string | null };
type MemberStat = { jkt48_id: string | null; name: string; show_count: number };

type Props = {
  showId: number;
  setlistName: string | null;
  showDate: string | null;
  showTime: string | null;
  members: Member[];
  memberStats: MemberStat[];
};

// Twitter counts any URL as 23 chars regardless of actual length
const TWITTER_URL_LENGTH = 23;
const MAX_TWEET = 280;

function buildTweetText(props: Props, pageUrl: string): string {
  const { setlistName, showDate, showTime, members, memberStats } = props;

  const header = [
    setlistName ?? "JKT48 Theater Show",
    showDate ? formatDate(showDate) : null,
    showTime ? `${showTime} WIB` : null,
  ]
    .filter(Boolean)
    .join(" | ");

  const statLookup = new Map(memberStats.map((s) => [s.jkt48_id, s.show_count]));
  const sorted = [...members].sort((a, b) => {
    const ca = (a.jkt48_id ? statLookup.get(a.jkt48_id) : 0) ?? 0;
    const cb = (b.jkt48_id ? statLookup.get(b.jkt48_id) : 0) ?? 0;
    return cb - ca;
  });

  const intro = `${header}\n\nMembers:\n`;
  // Use a placeholder of the correct length to measure char budget correctly
  const footer = `\n\n${" ".repeat(TWITTER_URL_LENGTH)}`;

  let memberBody = "";
  let truncated = 0;
  for (let i = 0; i < sorted.length; i++) {
    const m = sorted[i];
    const count = m.jkt48_id ? statLookup.get(m.jkt48_id) : undefined;
    const line = count != null ? `${m.name} (${count} shows)\n` : `${m.name}\n`;
    if ((intro + memberBody + line + footer).length > MAX_TWEET) {
      truncated = sorted.length - i;
      break;
    }
    memberBody += line;
  }
  if (truncated > 0) memberBody += `...and ${truncated} more`;

  return intro + memberBody + `\n\n${pageUrl}`;
}

export function ShareShowButton(props: Props) {
  function handleShare() {
    const url = window.location.href;
    const text = buildTweetText(props, url);
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  return (
    <button
      onClick={handleShare}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-xs font-medium hover:bg-primary hover:text-white transition-colors"
    >
      Share on X →
    </button>
  );
}
