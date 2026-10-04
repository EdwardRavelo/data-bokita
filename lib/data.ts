import type { Match } from "./domain/types";
import { getSeasonMatches } from "./sources/espn";

/** Año en curso en Argentina (UTC-3). */
export function currentYear(now = new Date()): number {
  return new Date(now.getTime() - 3 * 3_600_000).getUTCFullYear();
}

export const getCurrentSeason = () => getSeasonMatches(currentYear());

/** Partido en juego, o el próximo programado. */
export function nextMatch(matches: Match[]): Match | null {
  return (
    matches.find((m) => m.status === "live") ??
    matches.find((m) => m.status === "scheduled" && Date.parse(m.date) > Date.now() - 3 * 3_600_000) ??
    null
  );
}

export function lastFinished(matches: Match[]): Match | null {
  return matches.findLast((m) => m.status === "finished") ?? null;
}
