import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { yearParam } from "../lib/data";
import { buildSeries, splitStage, tablePhase } from "../lib/domain/series";
import { summarizeSeason } from "../lib/domain/season";
import { logoSrc, stageName } from "../lib/format";
import { parseSchedule, parseStandings, standingsTypes } from "../lib/sources/espn";

const fixture = (name: string) =>
  JSON.parse(readFileSync(join(__dirname, "fixtures", name), "utf-8")) as unknown;

const played = parseSchedule(fixture("schedule-2026.json"));
const upcoming = parseSchedule(fixture("fixtures.json"));
const season = [...played, ...upcoming];
const series = buildSeries(season);
const find = (slug: string, stage: string) =>
  series.find((s) => s.slug === slug && s.stage === stage)!;

describe("llaves eliminatorias", () => {
  it("ida y vuelta con global empatado: define la tanda de penales", () => {
    const s = find("conmebol.sudamericana", "Playoffs"); // O'Higgins: 1-0 y 0-1, 4-3 en penales
    expect(s.legs).toHaveLength(2);
    expect([s.boca, s.rivalGoals]).toEqual([1, 1]);
    expect(s.shootout).toEqual({ boca: 4, rival: 3 });
    expect(s.status).toBe("won");
  });

  it("ida y vuelta: gana el global", () => {
    expect(find("conmebol.sudamericana", "Octavos de final")).toMatchObject({ boca: 7, rivalGoals: 1, status: "won" });
    expect(find("conmebol.sudamericana", "Cuartos de final")).toMatchObject({ boca: 2, rivalGoals: 1, status: "won" });
  });

  it("partido único: Copa Argentina y fase final de la Liga", () => {
    expect(find("arg.copa", "Octavos de final")).toMatchObject({ status: "won", shootout: { boca: 4, rival: 3 } });
    expect(find("arg.copa", "Cuartos de final")).toMatchObject({ boca: 3, rivalGoals: 2, status: "won" });
    expect(find("arg.1", "Apertura - Octavos de final")).toMatchObject({ boca: 2, rivalGoals: 3, status: "lost" });
  });

  it("una llave con partidos por jugar queda en curso", () => {
    const semi = find("conmebol.sudamericana", "Semifinal");
    expect(semi.legs).toHaveLength(2);
    expect(semi.status).toBe("pending");
  });

  it("si falta la vuelta no se da por definida", () => {
    const onlyFirstLeg = buildSeries(played.filter((m) => m.id !== "401874164"));
    expect(onlyFirstLeg.find((s) => s.stage === "Playoffs")?.status).toBe("pending");
  });

  it("cada llave de la Liga se asocia a la fase de su torneo", () => {
    expect(splitStage("Apertura - Octavos de final")).toEqual({ phase: "Apertura", round: "Octavos de final" });
    expect(splitStage("Cuartos de final")).toEqual({ phase: null, round: "Cuartos de final" });
    expect(tablePhase("Torneo Apertura")).toBe("Apertura");
    expect(tablePhase("Torneo Clausura")).not.toBe(splitStage("Apertura - Octavos de final").phase);
  });

  it("la fase de grupos y los torneos regulares no son llaves", () => {
    expect(series.some((s) => s.stage === "Fase de grupos" || s.stage === "Torneo Clausura")).toBe(false);
  });
});

describe("tablas de todos los torneos", () => {
  it("detecta qué fases tienen tabla", () => {
    expect(standingsTypes(fixture("standings-types-2026.json"), 2026)).toEqual([
      { id: "1", name: "Torneo Apertura" },
      { id: "6", name: "Torneo Clausura" },
    ]);
  });

  it("Apertura: el récord calculado coincide con la tabla", () => {
    const groups = parseStandings(fixture("standings-apertura-2026.json"));
    expect(groups.map((g) => g.name)).toEqual(["Zona A", "Zona B"]);
    const row = groups.flatMap((g) => g.rows).find((r) => r.team.id === "5")!;
    const calc = summarizeSeason(
      played.filter((m) => m.competition.slug === "arg.1" && m.competition.stage === "Torneo Apertura"),
    ).total;
    expect([row.played, row.won, row.drawn, row.lost, row.goalsFor, row.goalsAgainst]).toEqual([
      calc.played,
      calc.won,
      calc.drawn,
      calc.lost,
      calc.goalsFor,
      calc.goalsAgainst,
    ]);
  });

  it("Libertadores: grupo de Boca ordenado y con récord coincidente", () => {
    const groups = parseStandings(fixture("standings-libertadores-2026.json"), "conmebol.libertadores");
    const group = groups.find((g) => g.rows.some((r) => r.team.id === "5"))!;
    expect(group.name).toBe("Grupo D");
    expect(group.rows.map((r) => r.rank)).toEqual([1, 2, 3, 4]);
    const row = group.rows.find((r) => r.team.id === "5")!;
    const calc = summarizeSeason(played.filter((m) => m.competition.slug === "conmebol.libertadores")).total;
    expect([row.played, row.won, row.drawn, row.lost]).toEqual([calc.played, calc.won, calc.drawn, calc.lost]);
  });
});

describe("utilidades", () => {
  it("escudos achicados desde el CDN de ESPN", () => {
    expect(logoSrc("https://a.espncdn.com/i/teamlogos/soccer/500/5.png", 24)).toBe(
      "https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/5.png&w=48&h=48",
    );
    expect(logoSrc("https://otro.cdn/escudo.png", 24)).toBe("https://otro.cdn/escudo.png");
  });

  it("año en la ruta", () => {
    expect(yearParam(undefined)).toBeNull();
    expect(yearParam(["2025"])).toBe(2025);
    expect(yearParam(["abc"])).toBe("invalid");
    expect(yearParam(["2025", "x"])).toBe("invalid");
  });

  it("instancias de temporadas anteriores", () => {
    expect(stageName("Second Stage")).toBe("Segunda fase");
    expect(stageName("Final ")).toBe("Final");
    expect(stageName("2024 Argentine Liga Profesional")).toBeNull();
  });
});
