import type { Metadata } from "next";
import Link from "next/link";
import { Card, Notice, ResultBadge, Section, SourceBadge, SourceError, TeamLogo } from "@/components/ui";
import { currentYear, getCurrentSeason } from "@/lib/data";
import { sides } from "@/lib/domain/match";
import {
  averageStat,
  effectiveness,
  finishedMatches,
  summarizeDiscipline,
  summarizeScorers,
  summarizeSeason,
  type TeamRecord,
} from "@/lib/domain/season";
import { BOCA_ID, type MatchDetail } from "@/lib/domain/types";
import { formatDate } from "@/lib/format";
import { getMatchDetail, getStandings } from "@/lib/sources/espn";

export const metadata: Metadata = { title: "Estadísticas" };
export const revalidate = 600;

function Big({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="rounded-lg bg-navy-800 p-3 text-center">
      <div className="font-display text-3xl font-bold tabular-nums text-gold-400">{value}</div>
      <div className="text-xs uppercase text-slate-400">{label}</div>
    </div>
  );
}

function RecordTable({ rows }: { rows: { name: string; record: TeamRecord }[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-navy-700">
      <table className="w-full text-sm">
        <thead className="bg-navy-800 text-xs uppercase text-slate-400">
          <tr>
            <th className="px-3 py-2 text-left font-medium"></th>
            {["PJ", "G", "E", "P", "GF", "GC", "DIF", "Ef."].map((h) => (
              <th key={h} className="px-2 py-2 text-right font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-navy-700 bg-navy-900 tabular-nums">
          {rows.map(({ name, record: r }) => (
            <tr key={name}>
              <td className="px-3 py-2">{name}</td>
              <td className="px-2 py-2 text-right">{r.played}</td>
              <td className="px-2 py-2 text-right">{r.won}</td>
              <td className="px-2 py-2 text-right">{r.drawn}</td>
              <td className="px-2 py-2 text-right">{r.lost}</td>
              <td className="px-2 py-2 text-right">{r.goalsFor}</td>
              <td className="px-2 py-2 text-right">{r.goalsAgainst}</td>
              <td className="px-2 py-2 text-right">
                {r.goalsFor - r.goalsAgainst > 0 ? "+" : ""}
                {r.goalsFor - r.goalsAgainst}
              </td>
              <td className="px-2 py-2 text-right">{effectiveness(r) ?? "–"}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function EstadisticasPage() {
  const [season, standings] = await Promise.all([getCurrentSeason(), getStandings()]);
  if (!season.ok) {
    return (
      <Section title="Estadísticas">
        <SourceError data={season} />
      </Section>
    );
  }

  const official = season.data.filter((m) => m.competition.slug !== "club.friendly");
  const summary = summarizeSeason(official);

  // Detalle de cada partido oficial jugado (cacheado un día por partido).
  const results = await Promise.all(finishedMatches(official).map(({ match }) => getMatchDetail(match)));
  const details = new Map<string, MatchDetail>();
  for (const r of results) if (r.ok) details.set(r.data.match.id, r.data);
  const detailList = [...details.values()];

  const scorers = summarizeScorers(official, details);
  const discipline = summarizeDiscipline(detailList);
  const averages = (
    [
      ["possessionPct", "Posesión", "%"],
      ["totalShots", "Remates", ""],
      ["shotsOnTarget", "Remates al arco", ""],
      ["wonCorners", "Córners", ""],
      ["foulsCommitted", "Faltas", ""],
    ] as const
  ).map(([key, label, unit]) => ({ label, unit, avg: averageStat(detailList, key) }));

  const group = standings.ok
    ? standings.data.find((g) => g.rows.some((r) => r.team.id === BOCA_ID))
    : undefined;
  const t = summary.total;

  return (
    <>
      <h1 className="mb-1 font-display text-3xl font-bold uppercase">Temporada {currentYear()}</h1>
      <p className="mb-6 text-sm text-slate-400">
        Partidos oficiales finalizados (sin amistosos). Una definición por penales cuenta como
        empate.
      </p>

      <Section title="Resumen">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          <Big value={t.played} label="Jugados" />
          <Big value={t.won} label="Ganados" />
          <Big value={t.drawn} label="Empatados" />
          <Big value={t.lost} label="Perdidos" />
          <Big value={`${t.goalsFor}-${t.goalsAgainst}`} label="Goles" />
          <Big value={`${effectiveness(t) ?? "–"}%`} label="Efectividad" />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span className="flex items-center gap-1">
            <span className="mr-1 text-slate-400">Últimos 5:</span>
            {summary.form.map(({ match, result }) => (
              <Link key={match.id} href={`/partidos/${match.id}`}>
                <ResultBadge result={result} />
              </Link>
            ))}
          </span>
          <span>
            <span className="text-slate-400">Vallas invictas:</span> {summary.cleanSheets}
          </span>
          {summary.biggestWin && (
            <span>
              <span className="text-slate-400">Mayor goleada:</span>{" "}
              <Link href={`/partidos/${summary.biggestWin.id}`} className="hover:text-gold-400">
                {sides(summary.biggestWin).boca.score}-{sides(summary.biggestWin).rival.score} vs{" "}
                {sides(summary.biggestWin).rival.team.name} ({formatDate(summary.biggestWin.date)})
              </Link>
            </span>
          )}
        </div>
      </Section>

      <Section title="Por competencia">
        <RecordTable
          rows={[
            ...summary.byCompetition.map((c) => ({ name: c.name, record: c.record })),
            { name: "Total", record: t },
          ]}
        />
      </Section>

      <Section title="Local y visitante">
        <RecordTable
          rows={[
            { name: "Local", record: summary.home },
            { name: "Visitante", record: summary.away },
          ]}
        />
      </Section>

      <Section title="Goleadores">
        {scorers.scorers.length === 0 ? (
          <p className="text-sm text-slate-400">Sin datos.</p>
        ) : (
          <ol className="divide-y divide-navy-700 rounded-lg border border-navy-700 bg-navy-900 text-sm">
            {scorers.scorers.map((s, i) => (
              <li key={s.name} className="flex items-center gap-3 px-4 py-2">
                <span className="w-5 text-right text-slate-400">{i + 1}</span>
                <span className="flex-1">{s.name}</span>
                {s.penalties > 0 && (
                  <span className="text-xs text-slate-400">
                    {s.penalties} de penal
                  </span>
                )}
                <span className="w-6 text-right font-display text-lg font-bold">{s.goals}</span>
              </li>
            ))}
          </ol>
        )}
        <div className="mt-3 space-y-2 text-sm text-slate-400">
          {scorers.ownGoalsFor > 0 && <p>Goles en contra de rivales: {scorers.ownGoalsFor}.</p>}
          {scorers.unattributed > 0 && (
            <Notice>
              {scorers.unattributed} {scorers.unattributed === 1 ? "gol no tiene" : "goles no tienen"}{" "}
              autor informado por la fuente y no se atribuyen a nadie. Partidos con detalle
              incompleto:{" "}
              {scorers.incompleteMatches.map((m, i) => (
                <span key={m.id}>
                  {i > 0 && ", "}
                  <Link href={`/partidos/${m.id}`} className="underline">
                    {sides(m).rival.team.name} ({formatDate(m.date)})
                  </Link>
                </span>
              ))}
              .
            </Notice>
          )}
        </div>
      </Section>

      <Section title="Promedios por partido">
        <div className="grid gap-3 sm:grid-cols-3">
          {averages.map(({ label, unit, avg }) => (
            <Card key={label}>
              <div className="text-xs uppercase text-slate-400">{label}</div>
              <div className="font-display text-2xl font-bold">
                {avg ? `${avg.value}${unit}` : "Sin datos"}
              </div>
              {avg && <div className="text-xs text-slate-500">en {avg.matches} partidos</div>}
            </Card>
          ))}
          <Card>
            <div className="text-xs uppercase text-slate-400">Tarjetas</div>
            <div className="font-display text-2xl font-bold">
              🟨 {discipline.yellow} · 🟥 {discipline.red}
            </div>
            <div className="text-xs text-slate-500">en {discipline.matches} partidos</div>
          </Card>
        </div>
      </Section>

      <Section title="Tabla Liga Profesional">
        {!standings.ok ? (
          <SourceError data={standings} />
        ) : !group ? (
          <p className="text-sm text-slate-400">Sin datos.</p>
        ) : (
          <>
            <p className="mb-2 text-sm text-slate-400">{group.name}</p>
            <div className="overflow-x-auto rounded-lg border border-navy-700">
              <table className="w-full text-sm">
                <thead className="bg-navy-800 text-xs uppercase text-slate-400">
                  <tr>
                    <th className="px-2 py-2 text-right font-medium">#</th>
                    <th className="px-2 py-2 text-left font-medium">Equipo</th>
                    {["PJ", "G", "E", "P", "DIF", "PTS"].map((h) => (
                      <th key={h} className="px-2 py-2 text-right font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-700 bg-navy-900 tabular-nums">
                  {group.rows.map((r) => (
                    <tr key={r.team.id} className={r.team.id === BOCA_ID ? "bg-gold-500/15 font-semibold" : ""}>
                      <td className="px-2 py-1.5 text-right">{r.rank}</td>
                      <td className="px-2 py-1.5">
                        <span className="flex items-center gap-2">
                          <TeamLogo team={r.team} size={18} />
                          {r.team.shortName}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 text-right">{r.played}</td>
                      <td className="px-2 py-1.5 text-right">{r.won}</td>
                      <td className="px-2 py-1.5 text-right">{r.drawn}</td>
                      <td className="px-2 py-1.5 text-right">{r.lost}</td>
                      <td className="px-2 py-1.5 text-right">{r.goalsFor - r.goalsAgainst}</td>
                      <td className="px-2 py-1.5 text-right">{r.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <SourceBadge data={standings} />
          </>
        )}
      </Section>
      <SourceBadge data={season} />
    </>
  );
}
