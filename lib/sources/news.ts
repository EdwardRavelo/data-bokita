import { XMLParser } from "fast-xml-parser";
import { z } from "zod";
import type { NewsItem, Sourced } from "../domain/types";

/**
 * Noticias del sitio oficial (bocajuniors.com.ar) vía el RSS de Google News.
 * No se lee el sitio oficial directamente porque su robots.txt no permite bots.
 */
export const SOURCE = "bocajuniors.com.ar (vía Google News)";
const OFFICIAL_HOST = "www.bocajuniors.com.ar";
const FEED_URL =
  "https://news.google.com/rss/search?q=site:bocajuniors.com.ar&hl=es-419&gl=AR&ceid=AR:es-419";
const MAX_AGE_DAYS = 60;

const itemSchema = z.object({
  title: z.string(),
  link: z.string().url(),
  pubDate: z.string(),
  source: z.object({ "@_url": z.string(), "#text": z.string().optional() }),
});

const feedSchema = z.object({
  rss: z.object({
    channel: z.object({ item: z.array(z.unknown()).optional() }),
  }),
});

const parser = new XMLParser({
  ignoreAttributes: false,
  isArray: (name) => name === "item",
  // Los títulos se toman como texto, sin interpretar números ni entidades raras.
  parseTagValue: false,
});

export function parseNews(xml: string, now: Date = new Date()): NewsItem[] {
  const feed = feedSchema.safeParse(parser.parse(xml));
  if (!feed.success) throw new Error("Formato de RSS inesperado");
  const minTime = now.getTime() - MAX_AGE_DAYS * 86_400_000;
  const seen = new Set<string>();
  const items: NewsItem[] = [];

  for (const raw of feed.data.rss.channel.item ?? []) {
    const parsed = itemSchema.safeParse(raw);
    if (!parsed.success) continue;
    const it = parsed.data;
    let host: string;
    try {
      host = new URL(it.source["@_url"]).host;
    } catch {
      continue;
    }
    if (host !== OFFICIAL_HOST) continue;
    const time = Date.parse(it.pubDate);
    if (!Number.isFinite(time) || time < minTime || time > now.getTime() + 3_600_000) continue;
    const title = it.title.replace(/\s+-\s+Boca Juniors\s*$/, "").trim();
    if (!title || seen.has(title)) continue;
    seen.add(title);
    items.push({ title, url: it.link, publishedAt: new Date(time).toISOString() });
  }
  return items.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export async function getNews(): Promise<Sourced<NewsItem[]>> {
  const fetchedAt = new Date().toISOString();
  try {
    const res = await fetch(FEED_URL, {
      next: { revalidate: 1800 },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`Google News respondió ${res.status}`);
    return { ok: true, data: parseNews(await res.text()), source: SOURCE, fetchedAt };
  } catch (err) {
    console.error("[news]", err);
    const error = err instanceof Error ? err.message : "Error desconocido";
    return { ok: false, error, source: SOURCE, fetchedAt };
  }
}
