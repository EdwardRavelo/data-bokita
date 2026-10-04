import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { averageStat, summarizeDiscipline, summarizeScorers, summarizeSeason } from "../lib/domain/season";
import { BOCA_ID, type Match, type MatchDetail, type Side } from "../lib/domain/types";
import { parseSchedule, parseSummary } from "../lib/sources/espn";

const fixture = (name: string) =>
  JSON.parse(readFileSync(join(__dirname, "fixtures", name), "utf-8")) as unknown;

const team = (id: string, name: string) => ({ id, name, shortName: name, abbreviation: name, logo: null });
const side = (id: string, score: number | null, shootout: number | null = null): Side => ({
  team: team(id, id === BOCA_ID ? "Boca" : `R${id}`),
  score,
  shootout,
});

function match(id: string, home: Side, away: Side, extra: Partial<Match> = {}): Match {
  return {
    id,
    date: `2026-03-${id.padStart(2, "0")}T22:00Z`,
    timeConfirmed: true,
    status: "finished",
    clock: null,
    decidedBy: "regular",
    competition: { slug: "arg.1", name: "Liga Profesional", stage: null },
    venue: null,
    home,
    away,
    ...extra,
  };
}

describe("summarizeSeason", () => {
  const matches = [
    match("1", side(BOCA_ID, 2), side("9", 0)), // G local
    match("2", side("9", 1), side(BOCA_ID, 1)), // E visitante
    match("3", side("9", 3), side(BOCA_ID, 1)), // P visitante
    match("4", side(BOCA_ID, 0), side("9", 0, 4), { decidedBy: "penalties" }), // E (penales)
    match("5", side(BOCA_ID, 5), side("9", 0), {
      competition: { slug: "club.friendly", name: "Amistoso", stage: null },
    }),
    match("6", side(BOCA_ID, null), side("9", null), { status: "scheduled", decidedBy: null }),
  ];

  it("cuenta G/E/P y goles solo de partidos oficiales finalizados", () => {
    const s = summarizeSeason(matches);
    expect(s.total).toEqual({ played: 4, won: 1, drawn: 2, lost: 1, goalsFor: 4, goalsAgainst: 4 });
    expect(s.home).toMatchObject({ played: 2, won: 1, drawn: 1 });
    expect(s.away).toMatchObject({ played: 2, drawn: 1, lost: 1 });
    expect(s.cleanSheets).toBe(2);
    expect(s.biggestWin?.id).toBe("1");
    expect(s.form.map((f) => f.result)).toEqual(["D", "L", "D", "W"]);
  });

  it("incluye amistosos solo si se pide", () => {
    const s = summarizeSeason(matches, { includeFriendlies: true });
    expect(s.total.played).toBe(5);
    expect(s.biggestWin?.id).toBe("5");
  });
});

describe("goleadores con datos reales", () => {
  const season = parseSchedule(fixture("schedule-2026.json"));
  const ids = ["401841594", "401886458", "401892190"];
  const games = season.filter((m) => ids.includes(m.id));
  const details = new Map<string, MatchDetail>(
    games.map((m) => [m.id, parseSummary(fixture(`summary-${m.id}.json`), m)]),
  );

  it("no inventa autores: el gol sin evento queda 'sin autor'", () => {
    const s = summarizeScorers(games, details);
    expect(s.scorers.reduce((n, x) => n + x.goals, 0)).toBe(3);
    expect(s.scorers.find((x) => x.name === "Lautaro Di Lollo")?.goals).toBe(1);
    expect(s.unattributed).toBe(1);
    expect(s.incompleteMatches.map((m) => m.id)).toEqual(["401886458"]);
  });

  it("un partido sin detalle cuenta todos sus goles como sin autor", () => {
    const s = summarizeScorers(games, new Map());
    expect(s.scorers).toHaveLength(0);
    expect(s.unattributed).toBe(4);
    expect(s.incompleteMatches).toHaveLength(3);
  });

  it("tarjetas y promedios", () => {
    const list = [...details.values()];
    const disc = summarizeDiscipline(list);
    expect(disc.matches).toBe(3);
    expect(disc.yellow).toBeGreaterThanOrEqual(2);
    const pos = averageStat(list, "possessionPct");
    expect(pos?.matches).toBeGreaterThan(0);
    expect(averageStat(list, "noExiste")).toBeNull();
  });
});
