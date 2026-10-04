import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { KickoffLabel, MatchMeta } from "@/components/MatchCard";
import { Card, Notice, Section, SourceBadge, SourceError, TeamLogo } from "@/components/ui";
import { getCurrentSeason } from "@/lib/data";
import { shootoutWinner } from "@/lib/domain/match";
import { BOCA_ID, type Lineup, type Match, type MatchDetail, type MatchEvent, type Team, type TeamStat } from "@/lib/domain/types";
import { STATUS_LABEL, formatLongDate, formatTime } from "@/lib/format";
import { getMatchDetail, isGoal } from "@/lib/sources/espn";

async function findMatch(id: string) {
  const season = await getCurrentSeason();
  return { season, match: season.ok ? season.data.find((m) => m.id === id) : undefined };
}

export async function generateMetadata(props: PageProps<"/partidos/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const { match } = await findMatch(id);
  return { title: match ? `${match.home.team.name} vs ${match.away.team.name}` : "Partido" };
}

const EVENT_ICON: Record<MatchEvent["type"], string> = {
  goal: "⚽",
  penaltyGoal: "⚽",
  ownGoal: "⚽",
  penaltyMissed: "✗",
  yellowCard: "🟨",
  redCard: "🟥",
  substitution: "⇄",
};

function eventText(e: MatchEvent): string {
  const who = e.player ?? "Jugador sin informar";
  switch (e.type) {
    case "goal":
      return e.secondary ? `${who} (asist. ${e.secondary})` : who;
    case "penaltyGoal":
      return `${who} (penal)`;
    case "ownGoal":
      return `${who} (en contra)`;
    case "penaltyMissed":
      return `${who} erró un penal`;
    case "substitution":
      return `Entra ${who}${e.secondary ? `, sale ${e.secondary}` : ""}`;
    default:
      return who;
  }
}

function Scoreboard({ detail }: { detail: MatchDetail }) {
  const { match } = detail;
  const goals = detail.events.filter(isGoal);
  const pens = shootoutWinner(match);
  const scorers = (team: Team) =>
    goals
      .filter((g) => g.teamId === team.id)
      .map((g, i) => (
        <li key={i}>
          {g.minute} {eventText(g)}
        </li>
      ));

  return (
    <Card>
      <p className="text-center text-xs text-slate-400">
        <MatchMeta match={match} />
      </p>
      <p className="mt-1 text-center text-xs text-slate-400">
        {formatLongDate(match.date)}
        {match.timeConfirmed && ` · ${formatTime(match.date)} h`}
        {match.venue && ` · ${match.venue}`}
      </p>
      <div className="my-5 grid grid-cols-[1fr_auto_1fr] items-start gap-3">
        {[match.home, match.away].map((side, i) => (
          <div
            key={side.team.id}
            className={`flex flex-col items-center gap-2 text-center ${i === 1 ? "order-3" : ""}`}
          >
            <TeamLogo team={side.team} size={64} />
            <span className="font-semibold">{side.team.name}</span>
            <ul className="text-xs text-slate-300">{scorers(side.team)}</ul>
          </div>
        ))}
        <div className="order-2 pt-4 text-center">
          {match.home.score !== null && match.away.score !== null ? (
            <p className="font-display text-5xl font-bold tabular-nums">
              {match.home.score} - {match.away.score}
            </p>
          ) : (
            <p className="font-display text-3xl font-bold text-slate-400">vs</p>
          )}
          <p className="mt-1 text-xs text-slate-400">
            {match.status === "scheduled" ? <KickoffLabel match={match} /> : STATUS_LABEL[match.status]}
            {match.status === "live" && match.clock && ` · ${match.clock}`}
            {match.decidedBy === "extraTime" && " · con alargue"}
          </p>
          {match.home.shootout !== null && match.away.shootout !== null && (
            <p className="mt-1 text-xs text-gold-400">
              Penales: {match.home.shootout} - {match.away.shootout}
              {pens && ` (${pens === "boca" ? "ganó Boca" : "perdió Boca"})`}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

function Timeline({ match, events }: { match: Match; events: MatchEvent[] }) {
  if (events.length === 0) return <p className="text-sm text-slate-400">Sin datos.</p>;
  return (
    <ol className="space-y-1 text-sm">
      {events.map((e, i) => {
        const home = e.teamId === match.home.team.id;
        return (
          <li
            key={i}
            className={`flex items-center gap-2 ${home ? "" : "flex-row-reverse text-right"}`}
          >
            <span className="w-12 shrink-0 text-center text-xs tabular-nums text-slate-400">
              {e.minute}
            </span>
            <span className="w-5 shrink-0 text-center" aria-hidden>
              {EVENT_ICON[e.type]}
            </span>
            <span className={isGoal(e) ? "font-semibold text-white" : "text-slate-300"}>
              {eventText(e)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function StatRow({ stat, bocaHome }: { stat: TeamStat; bocaHome: boolean }) {
  const total = (stat.homeValue ?? 0) + (stat.awayValue ?? 0);
  const homePct = total > 0 && stat.homeValue !== null ? (stat.homeValue / total) * 100 : 50;
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="tabular-nums">{stat.home}</span>
        <span className="text-xs text-slate-400">{stat.label}</span>
        <span className="tabular-nums">{stat.away}</span>
      </div>
      {stat.homeValue !== null && total > 0 && (
        <div className="flex h-1.5 overflow-hidden rounded-full bg-navy-700">
          {/* Dorado = Boca, gris = rival. */}
          <div className={bocaHome ? "bg-gold-500" : "bg-slate-400"} style={{ width: `${homePct}%` }} />
          <div className={`flex-1 ${bocaHome ? "bg-slate-400" : "bg-gold-500"}`} />
        </div>
      )}
    </div>
  );
}

function LineupCard({ lineup, team }: { lineup: Lineup; team: Team }) {
  return (
    <Card>
      <div className="mb-3 flex items-center gap-2">
        <TeamLogo team={team} size={24} />
        <span className="font-semibold">{team.name}</span>
        {lineup.formation && <span className="ml-auto text-xs text-slate-400">{lineup.formation}</span>}
      </div>
      <ul className="space-y-0.5 text-sm">
        {lineup.starters.map((p) => (
          <li key={p.id} className="flex gap-2">
            <span className="w-6 text-right tabular-nums text-slate-400">{p.jersey ?? "–"}</span>
            <span>{p.name}</span>
            {p.subbedOut && <span className="text-xs text-red-400" title="Salió">↓</span>}
          </li>
        ))}
      </ul>
      {lineup.bench.some((p) => p.subbedIn) && (
        <>
          <p className="mt-3 mb-1 text-xs uppercase text-slate-400">Ingresaron</p>
          <ul className="space-y-0.5 text-sm">
            {lineup.bench
              .filter((p) => p.subbedIn)
              .map((p) => (
                <li key={p.id} className="flex gap-2">
                  <span className="w-6 text-right tabular-nums text-slate-400">{p.jersey ?? "–"}</span>
                  <span>{p.name}</span>
                  <span className="text-xs text-emerald-400" title="Entró">↑</span>
                </li>
              ))}
          </ul>
        </>
      )}
    </Card>
  );
}

export default async function MatchPage(props: PageProps<"/partidos/[id]">) {
  const { id } = await props.params;
  const { season, match } = await findMatch(id);
  if (!season.ok) return <SourceError data={season} />;
  if (!match) notFound();

  const detail = await getMatchDetail(match);
  if (!detail.ok) return <SourceError data={detail} />;
  const d = detail.data;
  const played = d.match.status === "finished" || d.match.status === "live";
  const teamOf = (teamId: string) => (teamId === d.match.home.team.id ? d.match.home.team : d.match.away.team);

  return (
    <>
      <Scoreboard detail={d} />
      {played && !d.eventsMatchScore && (
        <div className="mt-4">
          <Notice>
            La fuente no informa el detalle completo de los goles de este partido. Se muestra el
            resultado oficial, pero no se atribuyen goles sin datos.
          </Notice>
        </div>
      )}

      {played && (
        <div className="mt-8 grid gap-8 md:grid-cols-2">
          <Section title="Minuto a minuto">
            <Timeline match={d.match} events={d.events} />
          </Section>
          <Section title="Estadísticas">
            {d.stats.length === 0 ? (
              <p className="text-sm text-slate-400">Sin datos.</p>
            ) : (
              <div className="space-y-3">
                {d.stats.map((s) => (
                  <StatRow key={s.key} stat={s} bocaHome={d.match.home.team.id === BOCA_ID} />
                ))}
              </div>
            )}
          </Section>
        </div>
      )}

      <Section title="Formaciones">
        {d.lineups.length === 0 ? (
          <p className="text-sm text-slate-400">
            {played ? "Sin datos." : "Las formaciones se publican cerca del inicio del partido."}
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {d.lineups.map((l) => (
              <LineupCard key={l.teamId} lineup={l} team={teamOf(l.teamId)} />
            ))}
          </div>
        )}
      </Section>
      <SourceBadge data={detail} />
    </>
  );
}
