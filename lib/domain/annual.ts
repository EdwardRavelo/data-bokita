import type { StandingRow, StandingsTable } from "./types";

/** Torneos de primera división que suman para la tabla anual. */
const ANNUAL_SLUGS = ["arg.1", "arg.copa_lpf"];

export type AnnualTable = {
  /** Fases sumadas, ej. ["Liga Profesional · Torneo Apertura", "Liga Profesional · Torneo Clausura"]. */
  phases: string[];
  rows: StandingRow[];
};

/**
 * Tabla anual del fútbol argentino: suma, equipo por equipo, las tablas de las fases
 * regulares de los torneos de primera del año (Apertura + Clausura; en 2024, Copa de la
 * Liga + Liga). Los puntos se suman tal cual los informa la fuente (incluye descuentos).
 *
 * Orden: puntos, diferencia de gol y goles a favor. Los equipos igualados en los tres
 * comparten posición: los desempates siguientes del reglamento no se pueden calcular con
 * estos datos y no se suponen.
 */
export function annualTable(tables: StandingsTable[]): AnnualTable | null {
  const league = tables.filter((t) => ANNUAL_SLUGS.includes(t.slug));
  if (league.length === 0) return null;

  const byTeam = new Map<string, StandingRow>();
  for (const table of league) {
    for (const r of table.groups.flatMap((g) => g.rows)) {
      const acc = byTeam.get(r.team.id);
      byTeam.set(
        r.team.id,
        acc
          ? {
              ...acc,
              played: acc.played + r.played,
              won: acc.won + r.won,
              drawn: acc.drawn + r.drawn,
              lost: acc.lost + r.lost,
              goalsFor: acc.goalsFor + r.goalsFor,
              goalsAgainst: acc.goalsAgainst + r.goalsAgainst,
              points: acc.points + r.points,
            }
          : { ...r },
      );
    }
  }

  const key = (r: StandingRow) => [r.points, r.goalsFor - r.goalsAgainst, r.goalsFor];
  const compare = (a: StandingRow, b: StandingRow) => {
    const [ka, kb] = [key(a), key(b)];
    const i = ka.findIndex((v, j) => v !== kb[j]);
    return i === -1 ? 0 : kb[i] - ka[i];
  };
  const sorted = [...byTeam.values()].sort((a, b) => compare(a, b) || a.team.name.localeCompare(b.team.name));
  const rows = sorted.map((r) => ({
    ...r,
    rank: 1 + sorted.filter((o) => compare(o, r) < 0).length,
  }));

  return {
    phases: league.map((t) => (t.stage ? `${t.competition} · ${t.stage}` : t.competition)),
    rows,
  };
}
