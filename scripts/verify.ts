/**
 * Control manual antes de publicar: imprime los últimos resultados y compara el
 * récord calculado del torneo de Liga en curso contra la tabla de posiciones de ESPN.
 * Uso: npm run verify
 */
import { resultFor, sides } from "../lib/domain/match";
import { summarizeSeason } from "../lib/domain/season";
import { BOCA_ID } from "../lib/domain/types";
import { formatDateTime } from "../lib/format";
import { fetchJson, getSeasonMatches, parseStandings } from "../lib/sources/espn";
import { currentYear } from "../lib/data";

async function main() {
  const season = await getSeasonMatches(currentYear());
  if (!season.ok) throw new Error(season.error);

  console.log("Últimos 10 resultados (compará con la web oficial):\n");
  for (const m of season.data.filter((x) => x.status === "finished").slice(-10).reverse()) {
    const { boca, rival } = sides(m);
    const pens = boca.shootout !== null ? ` (pen. ${boca.shootout}-${rival.shootout})` : "";
    console.log(
      `${formatDateTime(m.date)}  ${resultFor(m)}  Boca ${boca.score}-${rival.score} ${rival.team.name}${pens}  [${m.competition.name}${m.competition.stage ? ` · ${m.competition.stage}` : ""}]`,
    );
  }

  const next = season.data.find((m) => m.status === "scheduled");
  if (next) console.log(`\nPróximo: ${formatDateTime(next.date)} ${next.home.team.name} vs ${next.away.team.name}`);

  const standings = parseStandings(
    await fetchJson("https://site.api.espn.com/apis/v2/sports/soccer/arg.1/standings", 0),
  );
  const row = standings.flatMap((g) => g.rows).find((r) => r.team.id === BOCA_ID);
  const lastLeague = season.data.findLast((m) => m.competition.slug === "arg.1" && m.status === "finished");
  if (!row || !lastLeague) {
    console.log("\nNo se encontró a Boca en la tabla.");
    return;
  }
  const stage = lastLeague.competition.stage;
  const t = summarizeSeason(
    season.data.filter((m) => m.competition.slug === "arg.1" && m.competition.stage === stage),
  ).total;
  const calc = [t.played, t.won, t.drawn, t.lost, t.goalsFor, t.goalsAgainst];
  const table = [row.played, row.won, row.drawn, row.lost, row.goalsFor, row.goalsAgainst];
  const ok = calc.every((v, i) => v === table[i]);
  console.log(`\n${stage}: calculado PJ/G/E/P/GF/GC = ${calc.join("/")}`);
  console.log(`${stage}: tabla ESPN   PJ/G/E/P/GF/GC = ${table.join("/")}`);
  console.log(ok ? "✔ Coinciden" : "✘ NO coinciden: revisar antes de publicar");
  if (!ok) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
