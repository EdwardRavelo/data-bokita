import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { Archive } from "../lib/archive";
import { annualTable } from "../lib/domain/annual";
import { summarizeSeason } from "../lib/domain/season";
import { isKnockout } from "../lib/domain/series";
import { BOCA_ID, type StandingRow, type StandingsTable } from "../lib/domain/types";

const archive = (year: number) =>
  JSON.parse(readFileSync(join(__dirname, "..", "data", "archive", `${year}.json`), "utf-8")) as Archive;

const team = (id: string) => ({ id, name: `Equipo ${id}`, shortName: id, abbreviation: id, logo: null });
const row = (id: string, won: number, drawn: number, lost: number, gf: number, ga: number): StandingRow => ({
  rank: 0,
  team: team(id),
  played: won + drawn + lost,
  won,
  drawn,
  lost,
  goalsFor: gf,
  goalsAgainst: ga,
  points: won * 3 + drawn,
});
const table = (slug: string, stage: string | null, rows: StandingRow[]): StandingsTable => ({
  slug,
  competition: "Liga Profesional",
  stage,
  year: 2025,
  groups: [{ name: "Zona A", rows }],
});

describe("tabla anual", () => {
  it("suma Apertura y Clausura equipo por equipo e ignora las copas", () => {
    const t = annualTable([
      table("arg.1", "Torneo Apertura", [row("a", 2, 0, 0, 4, 1), row("b", 0, 1, 1, 1, 3)]),
      table("conmebol.libertadores", "Fase de grupos", [row("a", 5, 0, 0, 10, 0)]),
      table("arg.1", "Torneo Clausura", [row("b", 2, 0, 0, 3, 0), row("a", 0, 0, 2, 0, 2)]),
    ])!;
    expect(t.phases).toEqual(["Liga Profesional · Torneo Apertura", "Liga Profesional · Torneo Clausura"]);
    expect(t.rows.map((r) => [r.team.id, r.rank, r.played, r.points, r.goalsFor, r.goalsAgainst])).toEqual([
      ["b", 1, 4, 7, 4, 3],
      ["a", 2, 4, 6, 4, 3],
    ]);
  });

  it("ordena por puntos, diferencia y goles a favor; si todo empata comparten posición", () => {
    const t = annualTable([
      table("arg.1", null, [
        row("a", 1, 0, 0, 1, 0), // 3 pts, +1, 1 GF
        row("b", 1, 0, 1, 3, 2), // 3 pts, +1, 3 GF
        row("c", 1, 0, 0, 1, 0), // igual a "a"
        row("d", 1, 0, 0, 5, 1), // 3 pts, +4
      ]),
    ])!;
    expect(t.rows.map((r) => [r.team.id, r.rank])).toEqual([["d", 1], ["b", 2], ["a", 3], ["c", 3]]);
  });

  it("sin tablas de la liga no hay tabla anual", () => {
    expect(annualTable([table("conmebol.libertadores", "Fase de grupos", [row("a", 1, 0, 0, 1, 0)])])).toBeNull();
  });

  it.each([2024, 2025])("%i: la fila de Boca coincide con sus partidos de fase regular", (year) => {
    const a = archive(year);
    const t = annualTable(a.tables)!;
    const boca = t.rows.find((r) => r.team.id === BOCA_ID)!;
    // Partidos de liga (y Copa de la Liga) fuera de los playoffs.
    const regular = a.matches.filter(
      (m) =>
        ["arg.1", "arg.copa_lpf"].includes(m.competition.slug) &&
        !isKnockout(m),
    );
    const r = summarizeSeason(regular).total;
    expect([boca.played, boca.won, boca.drawn, boca.lost, boca.goalsFor, boca.goalsAgainst]).toEqual([
      r.played, r.won, r.drawn, r.lost, r.goalsFor, r.goalsAgainst,
    ]);
    // Todos los equipos jugaron lo mismo en cada fase completa.
    expect(new Set(t.rows.map((x) => x.played)).size).toBe(1);
  });
});
