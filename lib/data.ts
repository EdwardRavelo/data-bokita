import { archivedYears, detailFromArchive, readArchive } from "./archive";
import type { Match, MatchDetail, Sourced, StandingsTable } from "./domain/types";
import { getMatchDetail, getSeasonMatches, getStandingsTables } from "./sources/espn";

/** Año en curso en Argentina (UTC-3). */
export function currentYear(now = new Date()): number {
  return new Date(now.getTime() - 3 * 3_600_000).getUTCFullYear();
}

/**
 * La fuente en vivo no respondió. Se lanza (en vez de mostrar un error) para que
 * Next siga sirviendo la última versión buena de la página y reintente después.
 */
export class SourceUnavailableError extends Error {}

const isBuild = () => process.env.NEXT_PHASE === "phase-production-build";

export type Season = {
  year: number;
  matches: Match[];
  /** Texto para mostrar de dónde salen los datos. */
  source: string;
  /** ISO de la consulta en vivo, o de la última actualización del archivo. */
  updatedAt: string;
  /** true si la fuente en vivo falló y se muestran solo partidos archivados. */
  archiveOnly: boolean;
};

const ARCHIVE_SOURCE = "Archivo Data Bokita (datos de ESPN)";

/**
 * Partidos de una temporada. Los años pasados salen del archivo propio; el año en
 * curso combina ESPN en vivo (próximos, en juego y correcciones) con el archivo.
 * Devuelve null si el año no existe.
 */
export async function getSeason(year: number): Promise<Season | null> {
  const archive = await readArchive(year);
  if (year !== currentYear()) {
    if (!archive) return null;
    return {
      year,
      matches: archive.matches,
      source: ARCHIVE_SOURCE,
      updatedAt: archive.generatedAt,
      archiveOnly: false,
    };
  }

  const live = await getSeasonMatches(year);
  if (live.ok) {
    const byId = new Map((archive?.matches ?? []).map((m) => [m.id, m]));
    for (const m of live.data) byId.set(m.id, m);
    return {
      year,
      matches: [...byId.values()].sort((a, b) => a.date.localeCompare(b.date)),
      source: live.source,
      updatedAt: live.fetchedAt,
      archiveOnly: false,
    };
  }
  // Durante el build no hay versión anterior que conservar: se usa el archivo.
  if (archive && isBuild()) {
    return {
      year,
      matches: archive.matches,
      source: ARCHIVE_SOURCE,
      updatedAt: archive.generatedAt,
      archiveOnly: true,
    };
  }
  throw new SourceUnavailableError(live.error);
}

/** Temporadas que se pueden consultar, de la más reciente a la más vieja. */
export async function availableYears(): Promise<number[]> {
  const years = new Set(await archivedYears());
  years.add(currentYear());
  return [...years].sort((a, b) => b - a);
}

/**
 * Temporada que se muestra por defecto en estadísticas y tablas: la del año en curso
 * cuando ya empezaron los partidos oficiales; en el receso de enero, la anterior.
 */
export async function defaultStatsYear(): Promise<number> {
  const year = currentYear();
  const season = await getSeason(year);
  const started = season?.matches.some(
    (m) => m.status === "finished" && m.competition.slug !== "club.friendly",
  );
  return started || !(await readArchive(year - 1)) ? year : year - 1;
}

/** Busca un partido de Boca en cualquier temporada disponible. */
export async function findMatch(id: string): Promise<{ match: Match; year: number } | null> {
  for (const year of await availableYears()) {
    const season = await getSeason(year);
    const match = season?.matches.find((m) => m.id === id);
    if (match) return { match, year };
  }
  return null;
}

/**
 * Detalle de un partido: del archivo si ya terminó y está archivado (no cambia),
 * si no de ESPN en vivo.
 */
export async function getDetail(match: Match, year: number): Promise<Sourced<MatchDetail>> {
  const archive = await readArchive(year);
  const archived = archive && match.status === "finished" ? detailFromArchive(archive, match) : null;
  if (archived) {
    return { ok: true, data: archived, source: ARCHIVE_SOURCE, fetchedAt: archive!.generatedAt };
  }
  return getMatchDetail(match);
}

/**
 * Tablas de los torneos del año. En el año en curso se consultan en vivo
 * (con el archivo como respaldo); los años pasados, del archivo.
 */
export async function getTables(season: Season): Promise<Sourced<StandingsTable[]>> {
  const archive = await readArchive(season.year);
  const fromArchive = (): Sourced<StandingsTable[]> | null =>
    archive
      ? { ok: true, data: archive.tables, source: ARCHIVE_SOURCE, fetchedAt: archive.generatedAt }
      : null;

  if (season.year !== currentYear()) {
    return fromArchive() ?? { ok: true, data: [], source: ARCHIVE_SOURCE, fetchedAt: season.updatedAt };
  }
  const slugs = [...new Set(season.matches.map((m) => m.competition.slug))];
  const live = await getStandingsTables(slugs, season.year);
  if (live.ok) return live;
  if (isBuild() && fromArchive()) return fromArchive()!;
  throw new SourceUnavailableError(live.error);
}

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

/**
 * Año pedido en una ruta opcional (/estadisticas/2025). null = usar el por defecto;
 * "invalid" = no es un año válido (404).
 */
export function yearParam(param: string[] | undefined): number | null | "invalid" {
  if (!param || param.length === 0) return null;
  if (param.length > 1 || !/^\d{4}$/.test(param[0])) return "invalid";
  return Number(param[0]);
}

/** Parámetros estáticos para las rutas con temporada: la por defecto y cada año. */
export async function seasonStaticParams(): Promise<{ temporada?: string[] }[]> {
  return [{ temporada: undefined }, ...(await availableYears()).map((y) => ({ temporada: [String(y)] }))];
}
