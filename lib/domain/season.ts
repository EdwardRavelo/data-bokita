import { resultFor, sides } from "./match";
import { BOCA_ID, type Match, type MatchDetail, type Result } from "./types";

export type TeamRecord = {
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
};

const emptyRecord = (): TeamRecord => ({
  played: 0,
  won: 0,
  drawn: 0,
  lost: 0,
  goalsFor: 0,
  goalsAgainst: 0,
});

function add(rec: TeamRecord, match: Match, result: Result) {
  const { boca, rival } = sides(match);
  rec.played++;
  if (result === "W") rec.won++;
  else if (result === "D") rec.drawn++;
  else rec.lost++;
  rec.goalsFor += boca.score ?? 0;
  rec.goalsAgainst += rival.score ?? 0;
}

export const points = (r: TeamRecord) => r.won * 3 + r.drawn;

/** Porcentaje de puntos obtenidos sobre los disputados (null si no jugó). */
export const effectiveness = (r: TeamRecord) =>
  r.played === 0 ? null : Math.round((points(r) / (r.played * 3)) * 1000) / 10;

/** Solo partidos finalizados con resultado informado por la fuente. */
export function finishedMatches(matches: Match[]): { match: Match; result: Result }[] {
  return matches.flatMap((match) => {
    const result = resultFor(match);
    return result ? [{ match, result }] : [];
  });
}

export type SeasonSummary = {
  total: TeamRecord;
  home: TeamRecord;
  away: TeamRecord;
  byCompetition: { slug: string; name: string; record: TeamRecord }[];
  /** Últimos resultados, del más reciente al más viejo. */
  form: { match: Match; result: Result }[];
  cleanSheets: number;
  biggestWin: Match | null;
};

export function summarizeSeason(matches: Match[], { includeFriendlies = false } = {}): SeasonSummary {
  const done = finishedMatches(matches)
    .filter(({ match }) => includeFriendlies || match.competition.slug !== "club.friendly")
    .sort((a, b) => a.match.date.localeCompare(b.match.date));

  const total = emptyRecord();
  const home = emptyRecord();
  const away = emptyRecord();
  const comps = new Map<string, { slug: string; name: string; record: TeamRecord }>();
  let cleanSheets = 0;
  let biggestWin: Match | null = null;
  let biggestMargin = 0;

  for (const { match, result } of done) {
    add(total, match, result);
    add(match.home.team.id === BOCA_ID ? home : away, match, result);
    const c = match.competition;
    if (!comps.has(c.slug)) comps.set(c.slug, { slug: c.slug, name: c.name, record: emptyRecord() });
    add(comps.get(c.slug)!.record, match, result);

    const { boca, rival } = sides(match);
    if (rival.score === 0) cleanSheets++;
    const margin = (boca.score ?? 0) - (rival.score ?? 0);
    if (margin > biggestMargin) {
      biggestMargin = margin;
      biggestWin = match;
    }
  }

  return {
    total,
    home,
    away,
    byCompetition: [...comps.values()].sort((a, b) => b.record.played - a.record.played),
    form: done.slice(-5).reverse(),
    cleanSheets,
    biggestWin,
  };
}

export type Scorer = { name: string; goals: number; penalties: number };

export type ScorersSummary = {
  scorers: Scorer[];
  /** Goles en contra de jugadores rivales que favorecieron a Boca. */
  ownGoalsFor: number;
  /** Goles de Boca cuyo autor la fuente no informa. Nunca se adjudican a nadie. */
  unattributed: number;
  /** Partidos cuyo detalle no se pudo obtener o no coincide con el marcador. */
  incompleteMatches: Match[];
};

/**
 * Goleadores de Boca a partir del detalle de cada partido.
 * Si en un partido los eventos no suman el marcador, los goles faltantes quedan "sin autor".
 */
export function summarizeScorers(
  matches: Match[],
  details: Map<string, MatchDetail>,
): ScorersSummary {
  const byName = new Map<string, Scorer>();
  let ownGoalsFor = 0;
  let unattributed = 0;
  const incompleteMatches: Match[] = [];

  for (const { match } of finishedMatches(matches)) {
    const bocaGoals = sides(match).boca.score ?? 0;
    const detail = details.get(match.id);
    const goals = (detail?.events ?? []).filter(
      (e) => e.teamId === BOCA_ID && (e.type === "goal" || e.type === "penaltyGoal" || e.type === "ownGoal"),
    );
    if (!detail || !detail.eventsMatchScore) incompleteMatches.push(match);

    let counted = 0;
    for (const g of goals) {
      counted++;
      if (g.type === "ownGoal") {
        ownGoalsFor++;
        continue;
      }
      if (!g.player) {
        unattributed++;
        continue;
      }
      const s = byName.get(g.player) ?? { name: g.player, goals: 0, penalties: 0 };
      s.goals++;
      if (g.type === "penaltyGoal") s.penalties++;
      byName.set(g.player, s);
    }
    if (counted < bocaGoals) unattributed += bocaGoals - counted;
  }

  return {
    scorers: [...byName.values()].sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name)),
    ownGoalsFor,
    unattributed,
    incompleteMatches,
  };
}

export type DisciplineSummary = { yellow: number; red: number; matches: number };

export function summarizeDiscipline(details: MatchDetail[]): DisciplineSummary {
  let yellow = 0;
  let red = 0;
  for (const d of details) {
    for (const e of d.events) {
      if (e.teamId !== BOCA_ID) continue;
      if (e.type === "yellowCard") yellow++;
      if (e.type === "redCard") red++;
    }
  }
  return { yellow, red, matches: details.length };
}

/** Promedio de una estadística de Boca entre los partidos que la informan. */
export function averageStat(details: MatchDetail[], key: string): { value: number; matches: number } | null {
  const values = details.flatMap((d) => {
    const stat = d.stats.find((s) => s.key === key);
    if (!stat) return [];
    const v = d.match.home.team.id === BOCA_ID ? stat.homeValue : stat.awayValue;
    return v === null ? [] : [v];
  });
  if (values.length === 0) return null;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  return { value: Math.round(avg * 10) / 10, matches: values.length };
}
