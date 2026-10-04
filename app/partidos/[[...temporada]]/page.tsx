import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MatchList } from "@/components/MatchList";
import { ArchiveOnlyNotice, SeasonPicker, SourceBadge } from "@/components/ui";
import { availableYears, currentYear, getSeason, seasonStaticParams, yearParam } from "@/lib/data";

export const metadata: Metadata = { title: "Partidos" };
export const revalidate = 300;
export const generateStaticParams = seasonStaticParams;

export default async function PartidosPage(props: PageProps<"/partidos/[[...temporada]]">) {
  const { temporada } = await props.params;
  const param = yearParam(temporada);
  if (param === "invalid") notFound();
  const defaultYear = currentYear();
  const year = param ?? defaultYear;
  const season = await getSeason(year);
  if (!season) notFound();

  return (
    <>
      <h1 className="mb-4 font-display text-3xl font-bold uppercase">Partidos {year}</h1>
      <SeasonPicker years={await availableYears()} selected={year} defaultYear={defaultYear} base="/partidos" />
      {season.archiveOnly && (
        <div className="mb-4">
          <ArchiveOnlyNotice />
        </div>
      )}
      <MatchList matches={season.matches} />
      <SourceBadge data={{ source: season.source, fetchedAt: season.updatedAt }} />
    </>
  );
}
