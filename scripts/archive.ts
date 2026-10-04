/**
 * Guarda en data/archive/{año}.json los partidos jugados de Boca, su detalle y las
 * tablas de los torneos, normalizados a los tipos propios de la app.
 *
 * Uso: npm run archive            (año en curso)
 *      npm run archive 2024 2025  (años puntuales)
 *
 * Si un partido no se puede bajar, se conserva lo que ya estaba archivado.
 * Si el calendario completo falla, no se escribe nada.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { ARCHIVE_DIR, ARCHIVE_VERSION, readArchive, type Archive } from "../lib/archive";
import { currentYear } from "../lib/data";
import { summarizeSeason } from "../lib/domain/season";
import { BOCA_ID, type Match, type StandingsTable } from "../lib/domain/types";
import {
  LEAGUES_WITH_TABLES,
  fetchJson,
  fetchStandingsTables,
  parseSchedule,
  parseSummary,
} from "../lib/sources/espn";

const BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer";

/** Argentina es UTC-3 todo el año. */
const argYear = (iso: string) => new Date(Date.parse(iso) - 3 * 3_600_000).getUTCFullYear();

async function seasonMatches(year: number): Promise<Match[]> {
  const played = parseSchedule(await fetchJson(`${BASE}/all/teams/${BOCA_ID}/schedule?season=${year}`, 0));
  const byId = new Map(played.map((m) => [m.id, m]));
  if (year === currentYear()) {
    const upcoming = parseSchedule(await fetchJson(`${BASE}/all/teams/${BOCA_ID}/schedule?fixture=true`, 0));
    for (const m of upcoming) byId.set(m.id, m);
  }
  return [...byId.values()]
    .filter((m) => argYear(m.date) === year && m.status === "finished")
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Compara el récord de Boca en cada tabla con el calculado desde los partidos. */
function crossCheck(matches: Match[], tables: StandingsTable[]): string[] {
  const warnings: string[] = [];
  for (const t of tables) {
    const row = t.groups.flatMap((g) => g.rows).find((r) => r.team.id === BOCA_ID);
    if (!row) continue;
    const games = matches.filter((m) => m.competition.slug === t.slug && m.competition.stage === t.stage);
    const calc = summarizeSeason(games).total;
    const a = [calc.played, calc.won, calc.drawn, calc.lost, calc.goalsFor, calc.goalsAgainst];
    const b = [row.played, row.won, row.drawn, row.lost, row.goalsFor, row.goalsAgainst];
    if (a.some((v, i) => v !== b[i])) {
      warnings.push(
        `${t.competition} · ${t.stage}: partidos ${a.join("/")} vs tabla ${b.join("/")} (PJ/G/E/P/GF/GC)`,
      );
    }
  }
  return warnings;
}

async function archiveYear(year: number) {
  const previous = await readArchive(year);
  const matches = await seasonMatches(year);

  const details: Archive["details"] = {};
  let fetched = 0;
  for (const m of matches) {
    try {
      const d = parseSummary(await fetchJson(`${BASE}/all/summary?event=${m.id}`, 0), m);
      details[m.id] = { events: d.events, stats: d.stats, lineups: d.lineups, eventsMatchScore: d.eventsMatchScore };
      fetched++;
    } catch (err) {
      const kept = previous?.details[m.id];
      console.warn(`  ! ${m.id}: ${(err as Error).message}${kept ? " (se conserva el archivado)" : ""}`);
      if (kept) details[m.id] = kept;
    }
  }

  const slugs = [...new Set(matches.map((m) => m.competition.slug))].filter((s) =>
    LEAGUES_WITH_TABLES.includes(s),
  );
  let tables: StandingsTable[] = [];
  try {
    tables = (await Promise.all(slugs.map((s) => fetchStandingsTables(s, year, 0)))).flat();
  } catch (err) {
    console.warn(`  ! tablas: ${(err as Error).message} (se conservan las archivadas)`);
    tables = previous?.tables ?? [];
  }

  // Si un partido archivado ya no aparece en la fuente, se conserva.
  const ids = new Set(matches.map((m) => m.id));
  const kept = (previous?.matches ?? []).filter((m) => !ids.has(m.id));
  for (const m of kept) if (previous?.details[m.id]) details[m.id] = previous.details[m.id];
  const all = [...matches, ...kept].sort((a, b) => a.date.localeCompare(b.date));

  const archive: Archive = {
    version: ARCHIVE_VERSION,
    year,
    generatedAt: new Date().toISOString(),
    source: "ESPN",
    matches: all,
    details: Object.fromEntries(Object.entries(details).sort(([a], [b]) => a.localeCompare(b))),
    tables,
  };

  // Si los datos no cambiaron se conserva la fecha anterior: así no hay commits vacíos.
  const sameData = (a: Archive) => JSON.stringify({ ...a, generatedAt: "" });
  if (previous && sameData(previous) === sameData(archive)) {
    archive.generatedAt = previous.generatedAt;
  }

  await mkdir(ARCHIVE_DIR, { recursive: true });
  const file = path.join(ARCHIVE_DIR, `${year}.json`);
  await writeFile(file, JSON.stringify(archive, null, 2) + "\n", "utf-8");

  console.log(
    `${year}: ${all.length} partidos (${fetched} detalles nuevos, ${kept.length} conservados), ${tables.length} tablas → ${path.relative(process.cwd(), file)}`,
  );
  for (const w of crossCheck(all, tables)) console.warn(`  ⚠ ${w}`);
}

async function main() {
  const args = process.argv.slice(2).map(Number).filter(Number.isInteger);
  const years = args.length > 0 ? args : [currentYear()];
  for (const y of years) await archiveYear(y);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
