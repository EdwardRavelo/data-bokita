import Link from "next/link";
import { resultFor, shootoutWinner } from "@/lib/domain/match";
import type { Match, Side } from "@/lib/domain/types";
import { STATUS_LABEL, formatDate, formatTime } from "@/lib/format";
import { ResultBadge, TeamLogo } from "./ui";

function TeamRow({ side, bold }: { side: Side; bold: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <TeamLogo team={side.team} size={24} />
      <span className={`flex-1 truncate ${bold ? "font-semibold text-white" : "text-slate-300"}`}>
        {side.team.name}
      </span>
      {side.score !== null && (
        <span className="w-6 text-right font-display text-lg font-bold tabular-nums">
          {side.score}
          {side.shootout !== null && (
            <sup className="ml-0.5 text-[10px] font-normal text-slate-400">({side.shootout})</sup>
          )}
        </span>
      )}
    </div>
  );
}

export function MatchMeta({ match }: { match: Match }) {
  return (
    <>
      {match.competition.name}
      {match.competition.stage && ` · ${match.competition.stage}`}
    </>
  );
}

export function KickoffLabel({ match }: { match: Match }) {
  if (match.status === "live") {
    return (
      <span className="font-semibold text-red-400">
        ● En juego{match.clock ? ` ${match.clock}` : ""}
      </span>
    );
  }
  if (match.status !== "scheduled" && match.status !== "finished") {
    return <span className="font-semibold text-gold-400">{STATUS_LABEL[match.status]}</span>;
  }
  return (
    <span>
      {formatDate(match.date)}
      {match.timeConfirmed ? ` · ${formatTime(match.date)} h` : " · horario a confirmar"}
    </span>
  );
}

export function MatchCard({ match }: { match: Match }) {
  const result = resultFor(match);
  const pens = shootoutWinner(match);
  const winner =
    match.home.score !== null && match.away.score !== null
      ? match.home.score > match.away.score
        ? "home"
        : match.away.score > match.home.score
          ? "away"
          : null
      : null;

  return (
    <Link
      href={`/partidos/${match.id}`}
      className="block rounded-lg border border-navy-700 bg-navy-900 p-3 transition hover:border-gold-600"
    >
      <div className="mb-2 flex items-center justify-between gap-2 text-xs text-slate-400">
        <span className="truncate">
          <MatchMeta match={match} />
        </span>
        <span className="shrink-0">
          <KickoffLabel match={match} />
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 space-y-1">
          <TeamRow side={match.home} bold={winner === "home"} />
          <TeamRow side={match.away} bold={winner === "away"} />
        </div>
        {result && <ResultBadge result={result} />}
      </div>
      {pens && (
        <p className="mt-2 text-xs text-slate-400">
          {pens === "boca" ? "Boca ganó" : "Boca perdió"} la definición por penales.
        </p>
      )}
    </Link>
  );
}
