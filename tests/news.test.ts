import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseNews } from "../lib/sources/news";

const xml = readFileSync(join(__dirname, "fixtures", "news.xml"), "utf-8");
const now = new Date("2026-10-04T18:00:00Z");

describe("noticias oficiales", () => {
  const items = parseNews(xml, now);

  it("solo noticias recientes, ordenadas de la más nueva a la más vieja", () => {
    expect(items.length).toBeGreaterThan(0);
    const limit = now.getTime() - 60 * 86_400_000;
    for (const it of items) expect(Date.parse(it.publishedAt)).toBeGreaterThanOrEqual(limit);
    const dates = items.map((i) => i.publishedAt);
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it("limpia el sufijo del título y no repite titulares", () => {
    expect(items.some((i) => i.title === "Boca para el mundo")).toBe(true);
    expect(items.every((i) => !i.title.endsWith("- Boca Juniors"))).toBe(true);
    expect(new Set(items.map((i) => i.title)).size).toBe(items.length);
  });

  it("descarta subdominios que no son el sitio oficial de noticias", () => {
    expect(items.some((i) => /Boca Socios/i.test(i.title))).toBe(false);
  });

  it("falla con un feed que no es RSS", () => {
    expect(() => parseNews("<html></html>", now)).toThrow();
  });
});
