import { shootoutWinner, sides } from "./match";
import type { Match, Team } from "./types";

export type SeriesStatus = "won" | "lost" | "pending" | "unknown";

export type Series = {
  slug: string;
  competition: string;
  stage: string;
  rival: Team;
  /** Partidos de la llave en orden cronológico. */
  legs: Match[];
  /** Goles en el global (solo partidos jugados). */
  boca: number;
  rivalGoals: number;
  /** Penales de la definición, si la hubo. */
  shootout: { boca: number; rival: number } | null;
  status: SeriesStatus;
};

const KNOCKOUT = /avos de final|Octavos|Cuartos|Semifinal|Final|Playoffs|Primera fase|Segunda fase|Tercera fase|Repechaje/i;

export const isKnockout = (m: Match) => !!m.competition.stage && KNOCKOUT.test(m.competition.stage);

/**
 * Cuántos partidos tiene una llave. Las copas CONMEBOL se juegan ida y vuelta
 * salvo la final; Copa Argentina y las fases finales de la Liga, a partido único.
 */
function expectedLegs(m: Match): number {
  if (!m.competition.slug.startsWith("conmebol.")) return 1;
  return /^Final$/i.test(m.competition.stage ?? "") ? 1 : 2;
}

/**
 * Agrupa los partidos eliminatorios en llaves y determina quién pasó.
 * Si los datos no alcanzan para saberlo (falta un partido, global empatado sin
 * penales informados), la llave queda "pending" o "unknown": nunca se supone.
 */
export function buildSeries(matches: Match[]): Series[] {
  const groups = new Map<string, Match[]>();
  for (const m of matches) {
    if (!isKnockout(m)) continue;
    if (m.status === "canceled") continue;
    const key = `${m.competition.slug}|${m.competition.stage}|${sides(m).rival.team.id}`;
    groups.set(key, [...(groups.get(key) ?? []), m]);
  }

  const out: Series[] = [];
  for (const legs of groups.values()) {
    legs.sort((a, b) => a.date.localeCompare(b.date));
    const first = legs[0];
    let boca = 0;
    let rivalGoals = 0;
    for (const leg of legs) {
      const s = sides(leg);
      if (leg.status === "finished" && s.boca.score !== null && s.rival.score !== null) {
        boca += s.boca.score;
        rivalGoals += s.rival.score;
      }
    }
    const last = legs[legs.length - 1];
    const allPlayed =
      legs.length >= expectedLegs(first) && legs.every((l) => l.status === "finished");
    const lastSides = sides(last);
    const shootout =
      lastSides.boca.shootout !== null && lastSides.rival.shootout !== null
        ? { boca: lastSides.boca.shootout, rival: lastSides.rival.shootout }
        : null;

    let status: SeriesStatus = "pending";
    if (allPlayed) {
      if (boca !== rivalGoals) status = boca > rivalGoals ? "won" : "lost";
      else {
        const pens = shootoutWinner(last);
        status = pens === "boca" ? "won" : pens === "rival" ? "lost" : "unknown";
      }
    }

    out.push({
      slug: first.competition.slug,
      competition: first.competition.name,
      stage: first.competition.stage!,
      rival: sides(first).rival.team,
      legs,
      boca,
      rivalGoals,
      shootout,
      status,
    });
  }
  return out.sort((a, b) => a.legs[0].date.localeCompare(b.legs[0].date));
}

/**
 * Separa la fase del torneo de la instancia: "Apertura - Octavos de final" →
 * { phase: "Apertura", round: "Octavos de final" }. Sin fase: { phase: null, round }.
 */
export function splitStage(stage: string): { phase: string | null; round: string } {
  const i = stage.indexOf(" - ");
  return i === -1 ? { phase: null, round: stage } : { phase: stage.slice(0, i), round: stage.slice(i + 3) };
}

/** Fase a la que pertenece una tabla: "Torneo Apertura" → "Apertura". */
export const tablePhase = (stage: string | null) => (stage ? stage.replace(/^Torneo /, "") : null);
