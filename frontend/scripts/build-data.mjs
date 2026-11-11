// Pre-build: pull data from the local backend into public/data/*.json
import { mkdir, writeFile } from "node:fs/promises";

const BASE = process.env.BACKEND_URL || "http://localhost:8000";
const get = async (p) => {
  const r = await fetch(`${BASE}${p}`);
  if (!r.ok) throw new Error(`${p} -> ${r.status}`);
  return r.json();
};

const [members, past, upcoming, ongoing, topSetlists] = await Promise.all([
  get("/api/members/"),
  get("/api/theater-schedules/?past=true"),
  get("/api/theater-schedules/?upcoming=true"),
  get("/api/theater-schedules/?ongoing=true"),
  get("/api/theater-schedules/stats/top-setlists"),
]);

const byId = new Map(members.map((m) => [m.jkt48_id, m]));
const slim = (kind) => (s) => {
  const counts = {};
  for (const m of s.members) {
    const t = m.jkt48_id && byId.get(m.jkt48_id)?.team;
    if (t) counts[t] = (counts[t] ?? 0) + 1;
  }
  const teams = Object.keys(counts);
  const team = teams.sort((a, b) => counts[b] - counts[a])[0] ?? null;
  return {
    id: s.id,
    kind,
    show_date: s.show_date,
    show_time: s.show_time,
    setlist_name: s.setlist_name,
    member_count: s.member_count,
    team,
    teams,
    members: s.members.slice(0, 8).map((m) => ({
      name: m.name,
      image_url: (m.jkt48_id && byId.get(m.jkt48_id)?.image_url) || null,
    })),
  };
};

const shows = [
  ...ongoing.map(slim("ongoing")),
  ...upcoming.map(slim("upcoming")),
  ...past.map(slim("past")),
];

await mkdir("public/data", { recursive: true });
const memberStats = await get("/api/theater-schedules/member-stats");
await writeFile("public/data/members.json", JSON.stringify({ members, memberStats }));
await writeFile("public/data/theater-list.json", JSON.stringify({ shows, topSetlists }));
console.log(`theater-list.json: ${shows.length} shows`);
