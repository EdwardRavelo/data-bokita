export const BOCA_ID = "5";

export type MatchStatus =
  | "scheduled"
  | "live"
  | "finished"
  | "postponed"
  | "suspended"
  | "canceled";

/** Cómo terminó un partido finalizado. Los penales no cambian el resultado del partido (cuenta como empate). */
export type DecidedBy = "regular" | "extraTime" | "penalties";

export type Team = {
  id: string;
  name: string;
  shortName: string;
  abbreviation: string;
  logo: string | null;
};

export type Side = {
  team: Team;
  /** null = la fuente no informa marcador (partido no jugado). */
  score: number | null;
  shootout: number | null;
};

export type Competition = {
  slug: string;
  name: string;
  stage: string | null;
};

export type Match = {
  id: string;
  /** ISO UTC. */
  date: string;
  /** false cuando la fuente aún no confirmó el horario. */
  timeConfirmed: boolean;
  status: MatchStatus;
  /** Texto de estado tal como lo informa la fuente (ej. "45'+2'"). */
  clock: string | null;
  decidedBy: DecidedBy | null;
  competition: Competition;
  venue: string | null;
  home: Side;
  away: Side;
};

export type Result = "W" | "D" | "L";

export type MatchEventType =
  | "goal"
  | "penaltyGoal"
  | "ownGoal"
  | "penaltyMissed"
  | "yellowCard"
  | "redCard"
  | "substitution";

export type MatchEvent = {
  type: MatchEventType;
  minute: string;
  period: number;
  /** Equipo al que la fuente acredita el evento (en goles en contra: el beneficiado). */
  teamId: string;
  player: string | null;
  /** Asistidor en goles, jugador que sale en cambios. */
  secondary: string | null;
};

export type TeamStat = {
  key: string;
  label: string;
  home: string;
  away: string;
  /** Valores numéricos para dibujar barras; null si no son comparables. */
  homeValue: number | null;
  awayValue: number | null;
};

export type LineupPlayer = {
  id: string;
  name: string;
  jersey: string | null;
  position: string | null;
  subbedIn: boolean;
  subbedOut: boolean;
};

export type Lineup = {
  teamId: string;
  formation: string | null;
  starters: LineupPlayer[];
  bench: LineupPlayer[];
};

export type MatchDetail = {
  match: Match;
  events: MatchEvent[];
  stats: TeamStat[];
  lineups: Lineup[];
  /** true si los goles de los eventos suman exactamente el marcador. */
  eventsMatchScore: boolean;
};

export type NewsItem = {
  title: string;
  url: string;
  /** ISO UTC. */
  publishedAt: string;
};

/** Resultado de leer una fuente externa: los datos o el motivo por el que no se pueden mostrar. */
export type Sourced<T> =
  | { ok: true; data: T; source: string; fetchedAt: string }
  | { ok: false; error: string; source: string; fetchedAt: string };

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

/** Una tabla de un torneo/fase (ej. Liga Profesional · Torneo Apertura). */
export type StandingsTable = {
  slug: string;
  competition: string;
  stage: string | null;
  year: number;
  groups: StandingsGroup[];
};
