"use client";

import { useState } from "react";
import type { Match } from "@/lib/domain/types";
import { MatchCard } from "./MatchCard";
import { Section } from "./ui";

export function MatchList({ matches }: { matches: Match[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const competitions = [...new Map(matches.map((m) => [m.competition.slug, m.competition.name])).entries()];
  const shown = selected ? matches.filter((m) => m.competition.slug === selected) : matches;
  const upcoming = shown.filter((m) => m.status === "scheduled" || m.status === "live");
  const others = shown.filter((m) => m.status !== "scheduled" && m.status !== "live").reverse();

  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1 text-xs ${
      active
        ? "border-gold-500 bg-gold-500 font-semibold text-navy-950"
        : "border-navy-600 text-slate-300 hover:border-gold-500"
    }`;

  return (
    <>
      <nav className="mb-6 flex flex-wrap gap-2" aria-label="Filtrar por competencia">
        <button type="button" onClick={() => setSelected(null)} className={chip(!selected)}>
          Todas
        </button>
        {competitions.map(([slug, name]) => (
          <button key={slug} type="button" onClick={() => setSelected(slug)} className={chip(selected === slug)}>
            {name}
          </button>
        ))}
      </nav>

      {upcoming.length > 0 && (
        <Section title="Próximos">
          <div className="grid gap-3 sm:grid-cols-2">
            {upcoming.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        </Section>
      )}

      <Section title="Resultados">
        {others.length === 0 ? (
          <p className="text-sm text-slate-400">Todavía no hay partidos jugados.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {others.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        )}
      </Section>
    </>
  );
}
