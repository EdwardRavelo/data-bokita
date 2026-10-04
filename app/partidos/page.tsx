import type { Metadata } from "next";
import Link from "next/link";
import { MatchCard } from "@/components/MatchCard";
import { Section, SourceBadge, SourceError } from "@/components/ui";
import { currentYear, getCurrentSeason } from "@/lib/data";

export const metadata: Metadata = { title: "Partidos" };

export default async function PartidosPage(props: PageProps<"/partidos">) {
  const { comp } = await props.searchParams;
  const selected = typeof comp === "string" ? comp : null;
  const season = await getCurrentSeason();

  if (!season.ok) {
    return (
      <Section title="Partidos">
        <SourceError data={season} />
      </Section>
    );
  }

  const competitions = [
    ...new Map(season.data.map((m) => [m.competition.slug, m.competition.name])).entries(),
  ];
  const matches = selected
    ? season.data.filter((m) => m.competition.slug === selected)
    : season.data;
  const upcoming = matches.filter((m) => m.status === "scheduled" || m.status === "live");
  const others = matches
    .filter((m) => m.status !== "scheduled" && m.status !== "live")
    .reverse();

  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1 text-xs ${
      active
        ? "border-gold-500 bg-gold-500 font-semibold text-navy-950"
        : "border-navy-600 text-slate-300 hover:border-gold-500"
    }`;

  return (
    <>
      <h1 className="mb-4 font-display text-3xl font-bold uppercase">Partidos {currentYear()}</h1>
      <nav className="mb-6 flex flex-wrap gap-2" aria-label="Filtrar por competencia">
        <Link href="/partidos" className={chip(!selected)}>
          Todas
        </Link>
        {competitions.map(([slug, name]) => (
          <Link key={slug} href={`/partidos?comp=${slug}`} className={chip(selected === slug)}>
            {name}
          </Link>
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
      <SourceBadge data={season} />
    </>
  );
}
