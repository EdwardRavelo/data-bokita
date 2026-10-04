import { BOCA_ID, type Match, type Result, type Side } from "./types";

export function bocaSide(match: Match): "home" | "away" {
  return match.home.team.id === BOCA_ID ? "home" : "away";
}

export function sides(match: Match): { boca: Side; rival: Side } {
  return bocaSide(match) === "home"
    ? { boca: match.home, rival: match.away }
    : { boca: match.away, rival: match.home };
}

/**
 * Resultado de Boca según el marcador del partido (90' o 120').
 * Una definición por penales cuenta como empate, como en las estadísticas oficiales.
 */
export function resultFor(match: Match): Result | null {
  if (match.status !== "finished") return null;
  const { boca, rival } = sides(match);
  if (boca.score === null || rival.score === null) return null;
  if (boca.score > rival.score) return "W";
  if (boca.score < rival.score) return "L";
  return "D";
}

/** Ganador de la tanda de penales, si la hubo. */
export function shootoutWinner(match: Match): "boca" | "rival" | null {
  const { boca, rival } = sides(match);
  if (boca.shootout === null || rival.shootout === null) return null;
  if (boca.shootout === rival.shootout) return null;
  return boca.shootout > rival.shootout ? "boca" : "rival";
}
