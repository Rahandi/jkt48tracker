export const MILESTONE_INTERVAL = 100;

export function isAtMilestone(count: number): boolean {
  return count > 0 && count % MILESTONE_INTERVAL === 0;
}

export function nextMilestone(count: number): number {
  return Math.floor(count / MILESTONE_INTERVAL) * MILESTONE_INTERVAL + MILESTONE_INTERVAL;
}

export function showsUntilMilestone(count: number): number {
  return nextMilestone(count) - count;
}

// Returns the first milestone show for a member within `withinDays` days.
// upcomingShows must be the member's upcoming shows sorted by (show_date, show_time) ascending.
export function findMilestoneShow(
  currentCount: number,
  upcomingShows: Array<{ id: number; show_date: string | null; setlist_name?: string | null }>,
  withinDays = 7
): { showId: number; showDate: string; milestoneCount: number; showsAway: number } | null {
  const deadline = new Date(Date.now() + withinDays * 86_400_000);
  for (let i = 0; i < upcomingShows.length; i++) {
    const show = upcomingShows[i];
    if (!show.show_date) continue;
    if (new Date(show.show_date) > deadline) break;
    const countAfter = currentCount + i + 1;
    if (countAfter % MILESTONE_INTERVAL === 0) {
      return {
        showId: show.id,
        showDate: show.show_date,
        milestoneCount: countAfter,
        showsAway: i + 1,
      };
    }
  }
  return null;
}
