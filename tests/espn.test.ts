import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { resultFor, shootoutWinner, sides } from "../lib/domain/match";
import { summarizeSeason } from "../lib/domain/season";
import { parseSchedule, parseStandings, parseSummary } from "../lib/sources/espn";
import { stageName } from "../lib/format";

const fixture = (name: string) =>
  JSON.parse(readFileSync(join(__dirname, "fixtures", name), "utf-8")) as unknown;

const season = parseSchedule(fixture("schedule-2026.json"));
const upcoming = parseSchedule(fixture("fixtures.json"));
const byId = (id: string) => season.find((m) => m.id === id)!;

describe("calendario", () => {
  it("lee todos los partidos jugados de la temporada", () => {
    expect(season).toHaveLength(47);
    expect(season.every((m) => m.status === "finished")).toBe(true);
  });

  it("Boca 3-0 Unión (03/10, Clausura)", () => {
    const m = byId("401841594");
    expect(m.home.team.name).toBe("Boca Juniors");
    expect([m.home.score, m.away.score]).toEqual([3, 0]);
    expect(m.competition).toEqual({ slug: "arg.1", name: "Liga Profesional", stage: "Torneo Clausura" });
    expect(resultFor(m)).toBe("W");
  });

  it("una definición por penales cuenta como empate y guarda la tanda aparte", () => {
    const m = byId("401892190"); // Vélez 0-0 Boca, 3-4 en penales
    expect(m.decidedBy).toBe("penalties");
    expect(resultFor(m)).toBe("D");
    expect(sides(m).boca.shootout).toBe(4);
    expect(shootoutWinner(m)).toBe("boca");
  });

  it("no usa el flag 'winner' de la fuente (se refiere al partido, no a la serie)", () => {
    const m = byId("401874164"); // O'Higgins 1-0 Boca, Boca pasa por penales
    expect(resultFor(m)).toBe("L");
    expect(shootoutWinner(m)).toBe("boca");
  });

  it("los partidos por jugar no tienen marcador", () => {
    expect(upcoming.length).toBeGreaterThan(0);
    for (const m of upcoming) {
      expect(m.status).toBe("scheduled");
      expect(m.home.score).toBeNull();
      expect(m.away.score).toBeNull();
      expect(resultFor(m)).toBeNull();
    }
  });

  it("descarta eventos con formato inesperado sin romper el resto", () => {
    const raw = fixture("schedule-2026.json") as { events: unknown[] };
    const broken = { events: [{ id: "x" }, ...raw.events] };
    expect(parseSchedule(broken)).toHaveLength(47);
  });
});

describe("control cruzado con la tabla de posiciones", () => {
  it("el récord del Clausura calculado coincide con la tabla de ESPN", () => {
    const clausura = season.filter(
      (m) => m.competition.slug === "arg.1" && m.competition.stage === "Torneo Clausura",
    );
    const { total } = summarizeSeason(clausura);
    const boca = parseStandings(fixture("standings.json"))
      .flatMap((g) => g.rows)
      .find((r) => r.team.id === "5")!;
    expect(total).toEqual({
      played: boca.played,
      won: boca.won,
      drawn: boca.drawn,
      lost: boca.lost,
      goalsFor: boca.goalsFor,
      goalsAgainst: boca.goalsAgainst,
    });
    expect(boca.points).toBe(total.won * 3 + total.drawn);
  });
});

describe("detalle de partido", () => {
  it("Boca 3-0 Unión: eventos, estadísticas y formaciones", () => {
    const d = parseSummary(fixture("summary-401841594.json"), byId("401841594"));
    expect(d.eventsMatchScore).toBe(true);
    const goals = d.events.filter((e) => e.type === "goal" || e.type === "penaltyGoal");
    expect(goals).toHaveLength(3);
    expect(goals[0]).toMatchObject({ minute: "22'", player: "Lautaro Di Lollo", secondary: "Leandro Paredes" });
    const possession = d.stats.find((s) => s.key === "possessionPct")!;
    expect([possession.home, possession.away]).toEqual(["69.2%", "30.8%"]);
    const boca = d.lineups.find((l) => l.teamId === "5")!;
    expect(boca.formation).toBe("4-2-3-1");
    expect(boca.starters).toHaveLength(11);
    expect(boca.starters[0].name).toBe("Leandro Brey");
  });

  it("marca como incompleto un partido sin eventos de gol", () => {
    const d = parseSummary(fixture("summary-401886458.json"), byId("401886458"));
    expect(d.match.home.score).toBe(1);
    expect(d.events.filter((e) => e.type === "goal")).toHaveLength(0);
    expect(d.eventsMatchScore).toBe(false);
  });

  it("rechaza un resumen de otro partido", () => {
    expect(() => parseSummary(fixture("summary-401841594.json"), byId("401886458"))).toThrow();
  });
});

describe("traducciones", () => {
  it.each([
    ["Round of 16", "Octavos de final"],
    ["Apertura - Round of 16", "Apertura - Octavos de final"],
    ["Quarterfinals", "Cuartos de final"],
    ["Group Stage", "Fase de grupos"],
    ["2026 Club Friendly", null],
    ["Algo nuevo", "Algo nuevo"],
  ])("%s → %s", (input, out) => expect(stageName(input)).toBe(out));
});
