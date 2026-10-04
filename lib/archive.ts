import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import type { Match, MatchDetail, StandingsTable } from "./domain/types";

/**
 * Archivo propio de partidos jugados, guardado en el repo (data/archive/{año}.json).
 * Lo genera `npm run archive` (a diario con GitHub Actions) a partir de ESPN, y así
 * la historia no depende de que la fuente siga disponible.
 */
export const ARCHIVE_DIR = path.join(process.cwd(), "data", "archive");
export const ARCHIVE_VERSION = 1;

export type ArchivedDetail = Omit<MatchDetail, "match">;

export type Archive = {
  version: number;
  year: number;
  /** ISO UTC de la última actualización. */
  generatedAt: string;
  source: string;
  /** Solo partidos finalizados. */
  matches: Match[];
  details: Record<string, ArchivedDetail>;
  tables: StandingsTable[];
};

const cache = new Map<number, Promise<Archive | null>>();

export function readArchive(year: number): Promise<Archive | null> {
  if (!cache.has(year)) {
    cache.set(
      year,
      readFile(path.join(ARCHIVE_DIR, `${year}.json`), "utf-8")
        .then((txt) => {
          const a = JSON.parse(txt) as Archive;
          if (a.version !== ARCHIVE_VERSION || a.year !== year) {
            throw new Error(`Archivo ${year} con formato inesperado`);
          }
          return a;
        })
        .catch((err: NodeJS.ErrnoException) => {
          if (err.code === "ENOENT") return null;
          throw err;
        }),
    );
  }
  return cache.get(year)!;
}

/** Años archivados, del más reciente al más viejo. */
export async function archivedYears(): Promise<number[]> {
  try {
    const files = await readdir(ARCHIVE_DIR);
    return files
      .map((f) => /^(\d{4})\.json$/.exec(f)?.[1])
      .filter((y): y is string => !!y)
      .map(Number)
      .sort((a, b) => b - a);
  } catch {
    return [];
  }
}

export function detailFromArchive(archive: Archive, match: Match): MatchDetail | null {
  const d = archive.details[match.id];
  return d ? { match, ...d } : null;
}
