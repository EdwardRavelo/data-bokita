import type { Metadata } from "next";
import { NewsList } from "@/components/NewsList";
import { Section, SourceBadge, SourceError } from "@/components/ui";
import { getNews } from "@/lib/sources/news";

export const metadata: Metadata = { title: "Noticias" };
export const revalidate = 1800;

export default async function NoticiasPage() {
  const news = await getNews();
  return (
    <Section title="Noticias oficiales">
      <p className="mb-4 text-sm text-slate-400">
        Solo publicaciones del sitio oficial del club de los últimos 60 días. Cada titular lleva a
        la nota original.
      </p>
      {news.ok ? (
        <>
          <NewsList items={news.data} />
          <SourceBadge data={news} />
        </>
      ) : (
        <SourceError data={news} />
      )}
    </Section>
  );
}
