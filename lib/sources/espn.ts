import { z } from "zod";
import { competitionName, stageName } from "../format";
import {
  BOCA_ID,
  type DecidedBy,
  type Lineup,
  type LineupPlayer,
  type Match,
  type MatchDetail,
  type MatchEvent,
  type MatchStatus,
  type Side,
  type Sourced,
  type Team,
  type TeamStat,
} from "../domain/types";

export const SOURCE = "ESPN";
const BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer";

// ---------------------------------------------------------------------------
// Schemas: solo validamos los campos que usamos. Si cambian, se descarta el dato.
// ---------------------------------------------------------------------------

const logoSchema = z.object({ href: z.string(), rel: z.array(z.string()).optional() });

const teamSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  shortDisplayName: z.string().optional(),
  abbreviation: z.string().optional(),
  logos: z.array(logoSchema).optional(),
  logo: z.string().optional(),
});

const statusSchema = z.object({
  displayClock: z.string().optional(),
  type: z.object({
    name: z.string(),
    state: z.enum(["pre", "in", "post"]),
    completed: z.boolean(),
    detail: z.string().optional(),
  }),
});

// En el calendario el marcador es un objeto; en el resumen es un string.
const scoreSchema = z
  .union([
    z.string(),
    z.object({ value: z.number(), shootoutScore: z.number().optional() }),
  ])
  .optional();

const competitorSchema = z.object({
  homeAway: z.enum(["home", "away"]),
  team: teamSchema,
  score: scoreSchema,
  shootoutScore: z.number().optional(),
});

const eventSchema = z.object({
  id: z.string(),
  date: z.string(),
  timeValid: z.boolean().optional(),
  seasonType: z.object({ name: z.string() }).optional(),
  league: z.object({ slug: z.string(), name: z.string() }),
  competitions: z
    .array(
      z.object({
        status: statusSchema,
        venue: z.object({ fullName: z.string() }).optional(),
        competitors: z.array(competitorSchema).length(2),
      }),
    )
    .min(1),
});

export const scheduleSchema = z.object({ events: z.array(z.unknown()) });

const keyEventSchema = z.object({
  type: z.object({ type: z.string().optional(), text: z.string().optional() }),
  clock: z.object({ displayValue: z.string() }).optional(),
  period: z.object({ number: z.number() }).optional(),
  scoringPlay: z.boolean().optional(),
  shootout: z.boolean().optional(),
  team: z.object({ id: z.string() }).optional(),
  participants: z
    .array(z.object({ athlete: z.object({ displayName: z.string() }) }))
    .optional(),
});

const rosterSchema = z.object({
  team: z.object({ id: z.string() }),
  formation: z.string().optional(),
  roster: z
    .array(
      z.object({
        starter: z.boolean(),
        jersey: z.string().optional(),
        subbedIn: z.boolean().optional(),
        subbedOut: z.boolean().optional(),
        formationPlace: z.string().optional(),
        position: z.object({ abbreviation: z.string() }).optional(),
        athlete: z.object({ id: z.string(), displayName: z.string() }),
      }),
    )
    .optional(),
});

export const summarySchema = z.object({
  header: z.object({
    id: z.string(),
    competitions: z
      .array(
        z.object({
          status: statusSchema,
          competitors: z.array(competitorSchema).length(2),
        }),
      )
      .min(1),
  }),
  boxscore: z
    .object({
      teams: z
        .array(
          z.object({
            team: z.object({ id: z.string() }),
            statistics: z
              .array(z.object({ name: z.string(), displayValue: z.string() }))
              .optional(),
          }),
        )
        .optional(),
    })
    .optional(),
  keyEvents: z.array(keyEventSchema).optional(),
  rosters: z.array(rosterSchema).optional(),
});

// ---------------------------------------------------------------------------
// Mapeo a tipos propios
// ---------------------------------------------------------------------------

function toTeam(t: z.infer<typeof teamSchema>): Team {
  const logo =
    t.logos?.find((l) => l.rel?.includes("default"))?.href ?? t.logos?.[0]?.href ?? t.logo ?? null;
  return {
    id: t.id,
    name: t.displayName,
    shortName: (t.shortDisplayName ?? t.displayName).trim(),
    abbreviation: t.abbreviation ?? t.displayName.slice(0, 3).toUpperCase(),
    logo,
  };
}

function toStatus(s: z.infer<typeof statusSchema>): MatchStatus {
  const name = s.type.name;
  if (name.includes("POSTPONED")) return "postponed";
  if (name.includes("CANCELED") || name.includes("CANCELLED")) return "canceled";
  if (name.includes("SUSPENDED") || name.includes("ABANDONED")) return "suspended";
  if (s.type.state === "in") return "live";
  if (s.type.state === "post") return s.type.completed ? "finished" : "suspended";
  return "scheduled";
}

function toDecidedBy(s: z.infer<typeof statusSchema>, sides: Side[]): DecidedBy | null {
  if (toStatus(s) !== "finished") return null;
  if (s.type.name.includes("PEN") || sides.some((x) => x.shootout !== null)) return "penalties";
  if (s.type.name.includes("AET")) return "extraTime";
  return "regular";
}

function toSide(c: z.infer<typeof competitorSchema>, played: boolean): Side {
  let score: number | null = null;
  let shootout: number | null = c.shootoutScore ?? null;
  if (typeof c.score === "string") {
    const n = Number(c.score);
    score = c.score !== "" && Number.isFinite(n) ? n : null;
  } else if (c.score) {
    score = c.score.value;
    shootout = c.score.shootoutScore ?? shootout;
  }
  // Un partido no jugado no tiene marcador, aunque la fuente mande 0.
  if (!played) return { team: toTeam(c.team), score: null, shootout: null };
  return { team: toTeam(c.team), score, shootout };
}

function sidesOf(
  competitors: z.infer<typeof competitorSchema>[],
  status: MatchStatus,
): { home: Side; away: Side } | null {
  const played = status === "live" || status === "finished" || status === "suspended";
  const home = competitors.find((c) => c.homeAway === "home");
  const away = competitors.find((c) => c.homeAway === "away");
  if (!home || !away) return null;
  return { home: toSide(home, played), away: toSide(away, played) };
}

/** Convierte un evento del calendario. Devuelve null si no es válido o Boca no participa. */
export function parseEvent(raw: unknown): Match | null {
  const parsed = eventSchema.safeParse(raw);
  if (!parsed.success) return null;
  const e = parsed.data;
  const comp = e.competitions[0];
  const status = toStatus(comp.status);
  const s = sidesOf(comp.competitors, status);
  if (!s) return null;
  if (s.home.team.id !== BOCA_ID && s.away.team.id !== BOCA_ID) return null;
  return {
    id: e.id,
    date: e.date,
    timeConfirmed: e.timeValid ?? true,
    status,
    clock: status === "live" ? (comp.status.displayClock ?? null) : null,
    decidedBy: toDecidedBy(comp.status, [s.home, s.away]),
    competition: {
      slug: e.league.slug,
      name: competitionName(e.league.slug, e.league.name),
      stage: stageName(e.seasonType?.name),
    },
    venue: comp.venue?.fullName ?? null,
    home: s.home,
    away: s.away,
  };
}

export function parseSchedule(raw: unknown): Match[] {
  const parsed = scheduleSchema.safeParse(raw);
  if (!parsed.success) throw new Error("Formato de calendario inesperado");
  return parsed.data.events.map(parseEvent).filter((m): m is Match => m !== null);
}

const STAT_LABELS: [key: string, label: string][] = [
  ["possessionPct", "Posesión"],
  ["totalShots", "Remates"],
  ["shotsOnTarget", "Remates al arco"],
  ["saves", "Atajadas"],
  ["wonCorners", "Córners"],
  ["offsides", "Offsides"],
  ["foulsCommitted", "Faltas"],
  ["yellowCards", "Amarillas"],
  ["redCards", "Rojas"],
  ["totalPasses", "Pases"],
  ["accuratePasses", "Pases precisos"],
  ["totalTackles", "Quites"],
  ["interceptions", "Intercepciones"],
];

function toStats(
  teams: { team: { id: string }; statistics?: { name: string; displayValue: string }[] }[],
  homeId: string,
  awayId: string,
): TeamStat[] {
  const home = teams.find((t) => t.team.id === homeId)?.statistics;
  const away = teams.find((t) => t.team.id === awayId)?.statistics;
  if (!home || !away) return [];
  const out: TeamStat[] = [];
  for (const [key, label] of STAT_LABELS) {
    const h = home.find((s) => s.name === key)?.displayValue;
    const a = away.find((s) => s.name === key)?.displayValue;
    // Si falta en alguno de los dos equipos no se muestra (no se completa con 0).
    if (h === undefined || a === undefined || h === "" || a === "") continue;
    const hv = Number(h);
    const av = Number(a);
    const numeric = Number.isFinite(hv) && Number.isFinite(av);
    const suffix = key === "possessionPct" ? "%" : "";
    out.push({
      key,
      label,
      home: h + suffix,
      away: a + suffix,
      homeValue: numeric ? hv : null,
      awayValue: numeric ? av : null,
    });
  }
  return out;
}

function toEvents(keyEvents: z.infer<typeof keyEventSchema>[]): MatchEvent[] {
  const out: MatchEvent[] = [];
  for (const k of keyEvents) {
    if (k.shootout || !k.team) continue;
    const t = k.type.type ?? "";
    const names = k.participants?.map((p) => p.athlete.displayName) ?? [];
    let type: MatchEvent["type"] | null = null;
    if (t === "own-goal") type = "ownGoal";
    else if (t === "penalty---scored" && k.scoringPlay) type = "penaltyGoal";
    else if (t.startsWith("goal") && k.scoringPlay) type = "goal";
    else if (t === "penalty---missed" || t === "penalty---saved") type = "penaltyMissed";
    else if (t === "yellow-card") type = "yellowCard";
    else if (t === "red-card" || t === "yellow-red-card") type = "redCard";
    else if (t === "substitution") type = "substitution";
    if (!type) continue;
    out.push({
      type,
      minute: k.clock?.displayValue ?? "",
      period: k.period?.number ?? 0,
      teamId: k.team.id,
      player: names[0] ?? null,
      secondary: type === "ownGoal" || type === "penaltyGoal" ? null : (names[1] ?? null),
    });
  }
  return out;
}

const GOAL_TYPES = new Set<MatchEvent["type"]>(["goal", "penaltyGoal", "ownGoal"]);
export const isGoal = (e: MatchEvent) => GOAL_TYPES.has(e.type);

function toPlayer(r: NonNullable<z.infer<typeof rosterSchema>["roster"]>[number]): LineupPlayer {
  return {
    id: r.athlete.id,
    name: r.athlete.displayName,
    jersey: r.jersey ?? null,
    position: r.position?.abbreviation ?? null,
    subbedIn: r.subbedIn ?? false,
    subbedOut: r.subbedOut ?? false,
  };
}

function toLineups(rosters: z.infer<typeof rosterSchema>[]): Lineup[] {
  return rosters
    .filter((r) => r.roster && r.roster.length > 0)
    .map((r) => {
      const roster = r.roster!;
      const starters = roster
        .filter((p) => p.starter)
        .sort((a, b) => Number(a.formationPlace ?? 99) - Number(b.formationPlace ?? 99));
      return {
        teamId: r.team.id,
        formation: r.formation ?? null,
        starters: starters.map(toPlayer),
        bench: roster.filter((p) => !p.starter).map(toPlayer),
      };
    });
}

/**
 * Combina el partido del calendario con el resumen. El estado y marcador del resumen
 * prevalecen (es más reciente en partidos en vivo); competencia y estadio vienen del calendario.
 */
export function parseSummary(raw: unknown, base: Match): MatchDetail {
  const parsed = summarySchema.safeParse(raw);
  if (!parsed.success) throw new Error("Formato de resumen de partido inesperado");
  const s = parsed.data;
  if (s.header.id !== base.id) throw new Error("El resumen no corresponde al partido");
  const comp = s.header.competitions[0];
  const status = toStatus(comp.status);
  const sd = sidesOf(comp.competitors, status);
  if (!sd || sd.home.team.id !== base.home.team.id || sd.away.team.id !== base.away.team.id) {
    throw new Error("Los equipos del resumen no coinciden con el calendario");
  }
  const match: Match = {
    ...base,
    status,
    clock: status === "live" ? (comp.status.displayClock ?? null) : null,
    decidedBy: toDecidedBy(comp.status, [sd.home, sd.away]),
    home: { ...sd.home, team: base.home.team },
    away: { ...sd.away, team: base.away.team },
  };
  const events = toEvents(s.keyEvents ?? []);
  const goals = events.filter(isGoal);
  const eventsMatchScore =
    match.home.score !== null &&
    match.away.score !== null &&
    goals.filter((g) => g.teamId === match.home.team.id).length === match.home.score &&
    goals.filter((g) => g.teamId === match.away.team.id).length === match.away.score;
  return {
    match,
    events,
    stats: toStats(s.boxscore?.teams ?? [], match.home.team.id, match.away.team.id),
    lineups: toLineups(s.rosters ?? []),
    eventsMatchScore,
  };
}

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

async function fetchJson(url: string, revalidate: number): Promise<unknown> {
  const res = await fetch(url, {
    next: { revalidate },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`${SOURCE} respondió ${res.status}`);
  return res.json();
}

async function sourced<T>(fn: () => Promise<T>): Promise<Sourced<T>> {
  const fetchedAt = new Date().toISOString();
  try {
    return { ok: true, data: await fn(), source: SOURCE, fetchedAt };
  } catch (err) {
    console.error(`[${SOURCE}]`, err);
    const error = err instanceof Error ? err.message : "Error desconocido";
    return { ok: false, error, source: SOURCE, fetchedAt };
  }
}

const sortByDate = (a: Match, b: Match) => a.date.localeCompare(b.date);

/** Argentina es UTC-3 todo el año (sin horario de verano). */
const argentineYear = (iso: string) =>
  new Date(new Date(iso).getTime() - 3 * 3_600_000).getUTCFullYear();

/** Todos los partidos de Boca del año (jugados y por jugar), ordenados por fecha. */
export function getSeasonMatches(year: number): Promise<Sourced<Match[]>> {
  return sourced(async () => {
    const [played, upcoming] = await Promise.all([
      fetchJson(`${BASE}/all/teams/${BOCA_ID}/schedule?season=${year}`, 300).then(parseSchedule),
      fetchJson(`${BASE}/all/teams/${BOCA_ID}/schedule?fixture=true`, 300).then(parseSchedule),
    ]);
    const byId = new Map<string, Match>();
    for (const m of played) byId.set(m.id, m);
    // El fixture es más reciente para partidos en curso o reprogramados.
    for (const m of upcoming) byId.set(m.id, m);
    return [...byId.values()].filter((m) => argentineYear(m.date) === year).sort(sortByDate);
  });
}

export function getMatchDetail(base: Match): Promise<Sourced<MatchDetail>> {
  // Un partido terminado ya no cambia: se cachea un día. En curso o por jugar, un minuto.
  const revalidate = base.status === "finished" ? 86_400 : 60;
  return sourced(async () =>
    parseSummary(await fetchJson(`${BASE}/all/summary?event=${base.id}`, revalidate), base),
  );
}

export type StandingRow = {
  rank: number;
  team: Team;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
};

export type StandingsGroup = { name: string; rows: StandingRow[] };

const standingsSchema = z.object({
  children: z.array(
    z.object({
      name: z.string(),
      standings: z.object({
        entries: z.array(
          z.object({
            team: teamSchema,
            stats: z.array(z.object({ name: z.string(), value: z.number().optional() })),
          }),
        ),
      }),
    }),
  ),
});

export function parseStandings(raw: unknown): StandingsGroup[] {
  const parsed = standingsSchema.safeParse(raw);
  if (!parsed.success) throw new Error("Formato de tabla inesperado");
  return parsed.data.children.map((g) => ({
    name: g.name.replace(/^Group /, "Zona "),
    rows: g.standings.entries
      .map((e) => {
        const stat = (name: string) => {
          const v = e.stats.find((s) => s.name === name)?.value;
          if (v === undefined) throw new Error(`Falta ${name} en la tabla`);
          return v;
        };
        return {
          rank: stat("rank"),
          team: toTeam(e.team),
          played: stat("gamesPlayed"),
          won: stat("wins"),
          drawn: stat("ties"),
          lost: stat("losses"),
          goalsFor: stat("pointsFor"),
          goalsAgainst: stat("pointsAgainst"),
          points: stat("points"),
        };
      })
      .sort((a, b) => a.rank - b.rank),
  }));
}

export function getStandings(): Promise<Sourced<StandingsGroup[]>> {
  return sourced(async () =>
    parseStandings(
      await fetchJson("https://site.api.espn.com/apis/v2/sports/soccer/arg.1/standings", 600),
    ),
  );
}
