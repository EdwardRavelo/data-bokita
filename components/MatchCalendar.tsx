"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { dayKey, monthGrid, monthLabel } from "@/lib/calendar";
import type { MatchStatus, Result } from "@/lib/domain/types";

/** Datos mínimos de un partido para el calendario (serializables). */
export type CalendarMatch = {
  id: string;
  day: string;
  time: string | null;
  status: MatchStatus;
  isHome: boolean;
  rival: { name: string; abbreviation: string; logo: string | null };
  competition: { slug: string; name: string };
  score: { boca: number; rival: number } | null;
  result: Result | null;
};

const COMP_STYLE: Record<string, { dot: string; cell: string }> = {
  "arg.1": { dot: "bg-gold-500", cell: "border-gold-500/70 bg-gold-500/10" },
  "conmebol.libertadores": { dot: "bg-emerald-400", cell: "border-emerald-400/70 bg-emerald-400/10" },
  "conmebol.sudamericana": { dot: "bg-sky-400", cell: "border-sky-400/70 bg-sky-400/10" },
  "arg.copa": { dot: "bg-rose-400", cell: "border-rose-400/70 bg-rose-400/10" },
};
const DEFAULT_STYLE = { dot: "bg-slate-400", cell: "border-slate-400/60 bg-slate-400/10" };
const styleFor = (slug: string) => COMP_STYLE[slug] ?? DEFAULT_STYLE;

const RESULT_TEXT: Record<Result, { label: string; className: string }> = {
  W: { label: "G", className: "text-emerald-400" },
  D: { label: "E", className: "text-slate-300" },
  L: { label: "P", className: "text-red-400" },
};

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

// "Hoy" se calcula solo en el navegador: el HTML cacheado del servidor no marca ningún día.
const subscribe = (cb: () => void) => {
  const id = setInterval(cb, 60_000);
  return () => clearInterval(id);
};
const getToday = () => dayKey(Date.now());

function RivalLogo({ rival, size }: { rival: CalendarMatch["rival"]; size: number }) {
  if (!rival.logo) {
    return (
      <span
        className="inline-flex items-center justify-center rounded-full bg-navy-700 text-[9px] font-bold"
        style={{ width: size, height: size }}
      >
        {rival.abbreviation.slice(0, 3)}
      </span>
    );
  }
  return <Image src={rival.logo} alt={rival.name} width={size} height={size} className="object-contain" />;
}

function DayMatch({ m }: { m: CalendarMatch }) {
  const style = styleFor(m.competition.slug);
  const title = `${m.isHome ? "Boca vs" : "Boca en cancha de"} ${m.rival.name} · ${m.competition.name}${
    m.time ? ` · ${m.time} h` : ""
  }`;
  return (
    <Link
      href={`/partidos/${m.id}`}
      title={title}
      className={`group mt-1 flex flex-1 flex-col items-center justify-center gap-0.5 rounded-md border p-1 transition hover:scale-105 hover:shadow-lg hover:shadow-gold-500/10 ${style.cell}`}
    >
      <div className="relative">
        <span className="hidden sm:block">
          <RivalLogo rival={m.rival} size={30} />
        </span>
        <span className="sm:hidden">
          <RivalLogo rival={m.rival} size={20} />
        </span>
        {m.status === "live" && (
          <span className="absolute -top-1 -right-1 h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
        )}
      </div>
      <span className="hidden max-w-full truncate text-[11px] font-semibold text-white sm:block">
        {m.rival.abbreviation}
      </span>
      <span className="text-[10px] leading-none text-slate-300">
        {m.score ? (
          <span className={`font-bold ${m.result ? RESULT_TEXT[m.result].className : ""}`}>
            {m.score.boca}-{m.score.rival}
          </span>
        ) : m.status === "live" ? (
          <span className="font-bold text-red-400">VIVO</span>
        ) : (
          (m.time ?? "a conf.")
        )}
      </span>
      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
        {m.isHome ? "Local" : "Visit."}
      </span>
    </Link>
  );
}

export function MatchCalendar({
  matches,
  initialMonth,
  months,
}: {
  matches: CalendarMatch[];
  /** "YYYY-MM" que se muestra al abrir. */
  initialMonth: string;
  /** Meses navegables, en orden. */
  months: string[];
}) {
  const [month, setMonth] = useState(initialMonth);
  const today = useSyncExternalStore(subscribe, getToday, () => null);

  const byDay = new Map<string, CalendarMatch[]>();
  for (const m of matches) byDay.set(m.day, [...(byDay.get(m.day) ?? []), m]);

  const idx = months.indexOf(month);
  const prev = idx > 0 ? months[idx - 1] : null;
  const next = idx >= 0 && idx < months.length - 1 ? months[idx + 1] : null;
  const monthMatches = matches.filter((m) => m.day.startsWith(month));
  const upcomingInMonth = monthMatches.filter((m) => m.status === "scheduled" || m.status === "live");
  const usedComps = [...new Map(matches.map((m) => [m.competition.slug, m.competition.name])).entries()];

  const navBtn =
    "flex h-9 w-9 items-center justify-center rounded-full border border-navy-600 text-lg text-gold-400 transition hover:border-gold-500 hover:bg-gold-500 hover:text-navy-950 disabled:pointer-events-none disabled:opacity-30";

  return (
    <div className="overflow-hidden rounded-xl border border-navy-700 bg-gradient-to-b from-navy-800 to-navy-900 shadow-xl shadow-black/30">
      {/* Franja dorada como la camiseta */}
      <div className="h-1.5 bg-gold-500" />

      <div className="flex items-center justify-between px-4 py-3">
        <button
          type="button"
          className={navBtn}
          onClick={() => prev && setMonth(prev)}
          disabled={!prev}
          aria-label="Mes anterior"
        >
          ‹
        </button>
        <div className="text-center">
          <h3 className="font-display text-2xl font-bold uppercase tracking-wide text-white">
            {monthLabel(month)}
          </h3>
          <p className="text-xs text-slate-400">
            {monthMatches.length === 0
              ? "Sin partidos informados"
              : `${monthMatches.length} ${monthMatches.length === 1 ? "partido" : "partidos"}` +
                (upcomingInMonth.length > 0 ? ` · ${upcomingInMonth.length} por jugar` : "")}
          </p>
        </div>
        <button
          type="button"
          className={navBtn}
          onClick={() => next && setMonth(next)}
          disabled={!next}
          aria-label="Mes siguiente"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 px-2 pb-1 text-center text-[11px] font-semibold uppercase tracking-wider text-gold-400/80 sm:px-3">
        {WEEKDAYS.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 px-2 pb-3 sm:px-3">
        {monthGrid(month).flat().map((d) => {
          const dayMatches = byDay.get(d.key) ?? [];
          const isToday = d.key === today;
          return (
            <div
              key={d.key}
              className={`flex min-h-16 flex-col rounded-md p-1 sm:min-h-24 ${
                d.inMonth ? "bg-navy-950/40" : "opacity-30"
              } ${isToday ? "ring-2 ring-gold-500" : ""}`}
            >
              <span
                className={`text-[11px] font-semibold ${
                  isToday ? "text-gold-400" : d.inMonth ? "text-slate-300" : "text-slate-500"
                }`}
              >
                {d.day}
              </span>
              {d.inMonth && dayMatches.map((m) => <DayMatch key={m.id} m={m} />)}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t border-navy-700 px-4 py-2 text-[11px] text-slate-400">
        {usedComps.map(([slug, name]) => (
          <span key={slug} className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${styleFor(slug).dot}`} />
            {name}
          </span>
        ))}
        <span>· Horarios en hora argentina</span>
      </div>
    </div>
  );
}
