import Link from "next/link";
import { Countdown } from "@/components/Countdown";
import { KickoffLabel, MatchCard, MatchMeta } from "@/components/MatchCard";
import { MatchCalendar, type CalendarMatch } from "@/components/MatchCalendar";
import { Card, Section, SourceBadge, SourceError, TeamLogo } from "@/components/ui";
import { addMonths, currentMonth, dayKey, monthKey } from "@/lib/calendar";
import { getCurrentSeason, lastFinished, nextMatch } from "@/lib/data";
import { resultFor, sides } from "@/lib/domain/match";
import type { Match } from "@/lib/domain/types";
import { formatTime } from "@/lib/format";

export const revalidate = 300;

function NextMatch({ match }: { match: Match }) {
  return (
    <Card className="text-center">
      <p className="text-xs text-slate-400">
        <MatchMeta match={match} />
      </p>
      <div className="my-4 flex items-center justify-center gap-4">
        <div className="flex w-32 flex-col items-center gap-2">
          <TeamLogo team={match.home.team} size={56} />
          <span className="text-sm font-semibold">{match.home.team.name}</span>
        </div>
        <span className="font-display text-2xl font-bold text-slate-400">
          {match.status === "live" ? `${match.home.score ?? "-"} - ${match.away.score ?? "-"}` : "vs"}
        </span>
        <div className="flex w-32 flex-col items-center gap-2">
          <TeamLogo team={match.away.team} size={56} />
          <span className="text-sm font-semibold">{match.away.team.name}</span>
        </div>
      </div>
      <p className="mb-3 text-sm">
        <KickoffLabel match={match} />
        {match.venue && <span className="text-slate-400"> · {match.venue}</span>}
      </p>
      {match.status === "scheduled" && match.timeConfirmed && <Countdown to={match.date} />}
      <Link
        href={`/partidos/${match.id}`}
        className="mt-4 inline-block text-sm text-gold-400 hover:underline"
      >
        Ver ficha del partido →
      </Link>
    </Card>
  );
}

function toCalendarMatch(m: Match): CalendarMatch {
  const { boca, rival } = sides(m);
  return {
    id: m.id,
    day: dayKey(m.date),
    time: m.timeConfirmed ? formatTime(m.date) : null,
    status: m.status,
    isHome: m.home === boca,
    rival: { name: rival.team.name, abbreviation: rival.team.abbreviation, logo: rival.team.logo },
    competition: { slug: m.competition.slug, name: m.competition.name },
    score:
      boca.score !== null && rival.score !== null ? { boca: boca.score, rival: rival.score } : null,
    result: resultFor(m),
  };
}

/** Todos los meses entre el primer y el último partido, para navegar el calendario. */
function monthRange(matches: Match[], current: string): string[] {
  const keys = matches.map((m) => monthKey(m.date)).concat(current).sort();
  const out: string[] = [];
  for (let k = keys[0]; k <= keys[keys.length - 1]; k = addMonths(k, 1)) out.push(k);
  return out;
}

export default async function Home() {
  const season = await getCurrentSeason();
  const thisMonth = currentMonth();
  const next = season.ok ? nextMatch(season.data) : null;
  const last = season.ok ? lastFinished(season.data) : null;

  return (
    <>
      {season.ok ? (
        <>
          <Section title={next?.status === "live" ? "En vivo" : "Próximo partido"}>
            {next ? (
              <NextMatch match={next} />
            ) : (
              <Card className="text-sm text-slate-300">
                No hay partidos programados informados por la fuente.
              </Card>
            )}
          </Section>
          {last && (
            <Section
              title="Último resultado"
              action={
                <Link href="/partidos" className="text-sm text-gold-400 hover:underline">
                  Todos los partidos
                </Link>
              }
            >
              <MatchCard match={last} />
              <SourceBadge data={season} />
            </Section>
          )}
        </>
      ) : (
        <Section title="Partidos">
          <SourceError data={season} />
        </Section>
      )}

      {season.ok && (
        <Section
          title="Calendario"
          action={
            <Link href="/partidos" className="text-sm text-gold-400 hover:underline">
              Ver lista
            </Link>
          }
        >
          <MatchCalendar
            matches={season.data.map(toCalendarMatch)}
            initialMonth={next ? monthKey(next.date) : thisMonth}
            months={monthRange(season.data, thisMonth)}
          />
        </Section>
      )}
    </>
  );
}
