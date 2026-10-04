import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArchiveOnlyNotice, Card, SeasonPicker, Section, SourceBadge, TeamLogo } from "@/components/ui";
import {
  availableYears,
  defaultStatsYear,
  getSeason,
  getTables,
  seasonStaticParams,
  yearParam,
} from "@/lib/data";
import { sides } from "@/lib/domain/match";
import { buildSeries, splitStage, tablePhase, type Series, type SeriesStatus } from "@/lib/domain/series";
import { BOCA_ID, type StandingsGroup, type StandingsTable } from "@/lib/domain/types";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Tablas" };
export const revalidate = 600;
export const generateStaticParams = seasonStaticParams;

function GroupTable({ group }: { group: StandingsGroup }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-navy-700">
      <table className="w-full text-sm">
        <thead className="bg-navy-800 text-xs uppercase text-slate-400">
          <tr>
            <th className="px-2 py-2 text-left font-medium" colSpan={2}>
              {group.name}
            </th>
            {["PJ", "G", "E", "P", "GF", "GC", "DIF", "PTS"].map((h) => (
              <th key={h} className="px-2 py-2 text-right font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-navy-700 bg-navy-900 tabular-nums">
          {group.rows.map((r) => {
            const diff = r.goalsFor - r.goalsAgainst;
            return (
              <tr key={r.team.id} className={r.team.id === BOCA_ID ? "bg-gold-500/15 font-semibold" : ""}>
                <td className="w-8 px-2 py-1.5 text-right text-slate-400">{r.rank}</td>
                <td className="px-2 py-1.5">
                  <span className="flex items-center gap-2">
                    <TeamLogo team={r.team} size={18} />
                    <span className="truncate">{r.team.shortName}</span>
                  </span>
                </td>
                <td className="px-2 py-1.5 text-right">{r.played}</td>
                <td className="px-2 py-1.5 text-right">{r.won}</td>
                <td className="px-2 py-1.5 text-right">{r.drawn}</td>
                <td className="px-2 py-1.5 text-right">{r.lost}</td>
                <td className="px-2 py-1.5 text-right">{r.goalsFor}</td>
                <td className="px-2 py-1.5 text-right">{r.goalsAgainst}</td>
                <td className="px-2 py-1.5 text-right">
                  {diff > 0 ? "+" : ""}
                  {diff}
                </td>
                <td className="px-2 py-1.5 text-right font-semibold">{r.points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TableBlock({ table }: { table: StandingsTable }) {
  const bocaGroup = table.groups.find((g) => g.rows.some((r) => r.team.id === BOCA_ID));
  // Con muchos grupos (copas) se muestra el de Boca y el resto queda desplegable.
  const showAll = table.groups.length <= 2;
  const rest = table.groups.filter((g) => g !== bocaGroup);
  return (
    <div>
      <div className="space-y-3">
        {showAll ? (
          table.groups.map((g) => <GroupTable key={g.name} group={g} />)
        ) : (
          <>
            {bocaGroup && <GroupTable group={bocaGroup} />}
            {rest.length > 0 && (
              <details className="rounded-lg border border-navy-700 bg-navy-900/50">
                <summary className="cursor-pointer px-4 py-2 text-sm text-gold-400">
                  Ver los otros {rest.length} grupos
                </summary>
                <div className="space-y-3 p-3">
                  {rest.map((g) => (
                    <GroupTable key={g.name} group={g} />
                  ))}
                </div>
              </details>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const SERIES_STATUS: Record<SeriesStatus, { label: string; className: string }> = {
  won: { label: "Pasó", className: "bg-emerald-600 text-white" },
  lost: { label: "Eliminado", className: "bg-red-600 text-white" },
  pending: { label: "En curso", className: "bg-navy-600 text-slate-200" },
  unknown: { label: "Sin datos", className: "bg-slate-600 text-white" },
};

function SeriesCard({ series, label }: { series: Series; label?: string }) {
  const anyPlayed = series.legs.some((l) => l.status === "finished" || l.status === "live");
  const status =
    series.status === "pending" && !anyPlayed
      ? { label: "Por jugar", className: "bg-navy-600 text-slate-200" }
      : SERIES_STATUS[series.status];
  const twoLegs = series.legs.length > 1;
  return (
    <Card className="p-3">
      <div className="mb-2 flex items-center gap-2">
        <TeamLogo team={series.rival} size={24} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">vs {series.rival.name}</p>
          <p className="text-xs text-slate-400">{label ?? series.stage}</p>
        </div>
        <span className={`rounded px-2 py-0.5 text-xs font-bold ${status.className}`}>{status.label}</span>
      </div>
      <ul className="space-y-1 text-sm">
        {series.legs.map((leg, i) => {
          const { boca, rival } = sides(leg);
          const played = boca.score !== null && rival.score !== null;
          const home = leg.home.team.id === BOCA_ID;
          return (
            <li key={leg.id}>
              <Link href={`/partido/${leg.id}`} className="flex items-center gap-2 hover:text-gold-400">
                <span className="w-14 text-xs text-slate-400">{twoLegs ? (i === 0 ? "Ida" : "Vuelta") : "Partido"}</span>
                <span className="w-16 text-xs text-slate-400">{formatDate(leg.date)}</span>
                <span className="text-xs text-slate-400">{home ? "Local" : "Visitante"}</span>
                <span className="ml-auto font-semibold tabular-nums">
                  {played ? `${boca.score}-${rival.score}` : "por jugar"}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      {((twoLegs && anyPlayed) || series.shootout) && (
        <p className="mt-2 border-t border-navy-700 pt-2 text-xs text-slate-300">
          {twoLegs && anyPlayed && (
            <>
              Global: <span className="font-semibold tabular-nums">{series.boca}-{series.rivalGoals}</span>
            </>
          )}
          {series.shootout && (
            <>
              {twoLegs && " · "}Penales:{" "}
              <span className="font-semibold tabular-nums">
                {series.shootout.boca}-{series.shootout.rival}
              </span>
            </>
          )}
        </p>
      )}
    </Card>
  );
}

function SeriesGrid({ series, roundOnly }: { series: Series[]; roundOnly: boolean }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {series.map((s) => (
        <SeriesCard
          key={`${s.stage}-${s.rival.id}`}
          series={s}
          label={roundOnly ? splitStage(s.stage).round : undefined}
        />
      ))}
    </div>
  );
}

/** Una fase del torneo (ej. Torneo Apertura): su tabla y, debajo, sus llaves. */
function PhaseBlock({ table, series }: { table: StandingsTable; series: Series[] }) {
  return (
    <div className="mb-6 rounded-xl border border-navy-700 bg-navy-900/40 p-3 sm:p-4">
      <h3 className="mb-3 font-display text-lg font-bold uppercase tracking-wide text-white">
        {table.stage ?? "Tabla de posiciones"}
      </h3>
      <TableBlock table={table} />
      {series.length > 0 && (
        <>
          <h4 className="mt-5 mb-2 text-sm font-semibold uppercase tracking-wide text-gold-400">
            Fase final{table.stage ? ` · ${tablePhase(table.stage)}` : ""}
          </h4>
          <SeriesGrid series={series} roundOnly />
        </>
      )}
    </div>
  );
}

export default async function TablasPage(props: PageProps<"/tablas/[[...temporada]]">) {
  const { temporada } = await props.params;
  const param = yearParam(temporada);
  if (param === "invalid") notFound();
  const defaultYear = await defaultStatsYear();
  const year = param ?? defaultYear;
  const season = await getSeason(year);
  if (!season) notFound();

  const tables = await getTables(season);
  const series = buildSeries(season.matches);

  // Competencias en el orden en que Boca las jugó (sin amistosos).
  const comps = [
    ...new Map(
      season.matches
        .filter((m) => m.competition.slug !== "club.friendly")
        .map((m) => [m.competition.slug, m.competition.name]),
    ).entries(),
  ];

  return (
    <>
      <h1 className="mb-4 font-display text-3xl font-bold uppercase">Tablas {year}</h1>
      <SeasonPicker years={await availableYears()} selected={year} defaultYear={defaultYear} base="/tablas" />
      {season.archiveOnly && (
        <div className="mb-4">
          <ArchiveOnlyNotice />
        </div>
      )}

      {comps.length === 0 && <p className="text-sm text-slate-400">Todavía no hay partidos oficiales.</p>}

      {comps.map(([slug, name]) => {
        const compTables = tables.ok ? tables.data.filter((t) => t.slug === slug) : [];
        const compSeries = series.filter((s) => s.slug === slug);
        if (compTables.length === 0 && compSeries.length === 0) return null;
        // Cada llave va debajo de la tabla de su fase (Apertura con Apertura, Clausura con
        // Clausura). Las que no tienen fase (ej. octavos de una copa) van al final.
        const ofTable = (t: StandingsTable) =>
          compSeries.filter((s) => {
            const phase = splitStage(s.stage).phase;
            return phase !== null && phase === tablePhase(t.stage);
          });
        const placed = new Set(compTables.flatMap(ofTable));
        const rest = compSeries.filter((s) => !placed.has(s));
        return (
          <Section key={slug} title={name}>
            {compTables.map((t) => (
              <PhaseBlock key={`${t.slug}-${t.stage}`} table={t} series={ofTable(t)} />
            ))}
            {rest.length > 0 && (
              <>
                <h3 className="mb-2 font-semibold text-white">
                  {compTables.length > 0 ? "Fase eliminatoria" : "Camino de Boca"}
                </h3>
                <SeriesGrid series={rest} roundOnly={false} />
              </>
            )}
          </Section>
        );
      })}

      <p className="text-xs text-slate-400">
        Llaves calculadas con los resultados de cada partido; si faltan datos para saber quién pasó,
        se indica &quot;Sin datos&quot;.
      </p>
      <SourceBadge data={{ source: tables.source, fetchedAt: tables.fetchedAt }} />
    </>
  );
}
