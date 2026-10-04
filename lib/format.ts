import type { MatchStatus } from "./domain/types";

export const TIME_ZONE = "America/Argentina/Buenos_Aires";

const COMPETITIONS: Record<string, string> = {
  "arg.1": "Liga Profesional",
  "arg.copa": "Copa Argentina",
  "arg.supercopa": "Supercopa Argentina",
  "arg.trofeo_de_campeones": "Trofeo de Campeones",
  "conmebol.libertadores": "Copa Libertadores",
  "conmebol.sudamericana": "Copa Sudamericana",
  "conmebol.recopa": "Recopa Sudamericana",
  "fifa.cwc": "Mundial de Clubes",
  "club.friendly": "Amistoso",
};

/** Nombre de la competencia en español; si no la conocemos, se deja el nombre de la fuente. */
export function competitionName(slug: string, sourceName: string): string {
  return COMPETITIONS[slug] ?? sourceName;
}

const STAGES: [RegExp, string][] = [
  [/^Round of 64$/i, "32avos de final"],
  [/^Round of 32$/i, "16avos de final"],
  [/^Round of 16$/i, "Octavos de final"],
  [/^Quarterfinals?$/i, "Cuartos de final"],
  [/^Semifinals?$/i, "Semifinal"],
  [/^Finals?$/i, "Final"],
  [/^Group Stage$/i, "Fase de grupos"],
  [/^Knockout Round Playoffs$/i, "Playoffs"],
  [/^Torneo (Apertura|Clausura)$/i, "Torneo $1"],
];

/** Traduce la instancia; devuelve null cuando no aporta información (ej. "2026 Club Friendly"). */
export function stageName(source: string | null | undefined): string | null {
  if (!source) return null;
  if (/friendly/i.test(source)) return null;
  // "Apertura - Round of 16" → "Apertura - Octavos de final"
  return source
    .split(" - ")
    .map((part) => {
      for (const [re, out] of STAGES) if (re.test(part)) return part.replace(re, out);
      return part;
    })
    .join(" - ");
}

const dateFmt = new Intl.DateTimeFormat("es-AR", {
  timeZone: TIME_ZONE,
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
});
const longDateFmt = new Intl.DateTimeFormat("es-AR", {
  timeZone: TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});
const timeFmt = new Intl.DateTimeFormat("es-AR", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** "vie 09/10" (Intl en es-AR separa con guiones). */
export const formatDate = (iso: string) => {
  const p = Object.fromEntries(dateFmt.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return `${p.weekday} ${p.day}/${p.month}`;
};
export const formatLongDate = (iso: string) => longDateFmt.format(new Date(iso));
export const formatTime = (iso: string) => timeFmt.format(new Date(iso));
export const formatDateTime = (iso: string) => `${formatDate(iso)} ${formatTime(iso)}`;

export const STATUS_LABEL: Record<MatchStatus, string> = {
  scheduled: "Programado",
  live: "En juego",
  finished: "Finalizado",
  postponed: "Postergado",
  suspended: "Suspendido",
  canceled: "Cancelado",
};
