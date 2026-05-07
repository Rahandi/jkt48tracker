export type TeamColor = { hex: string; bg: string; text: string };

export const TEAM_COLORS: Record<string, TeamColor> = {
  LOVE:         { hex: "#e4002b", bg: "rgba(228,0,43,0.13)",    text: "#ff4d6d" },
  DREAM:        { hex: "#0077b6", bg: "rgba(0,119,182,0.13)",   text: "#48cae4" },
  PASSION:      { hex: "#e07b00", bg: "rgba(224,123,0,0.13)",   text: "#ffa940" },
  TRAINEE:      { hex: "#8a8a9a", bg: "rgba(138,138,154,0.13)", text: "#a0a0b8" },
  JKT48_VIRTUAL:{ hex: "#9b30d9", bg: "rgba(155,48,217,0.13)",  text: "#c084fc" },
};

export function getTeamColor(team: string | null | undefined): TeamColor | null {
  if (!team) return null;
  return TEAM_COLORS[team.toUpperCase()] ?? null;
}
