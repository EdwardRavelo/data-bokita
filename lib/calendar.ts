import { TIME_ZONE } from "./format";

const keyFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Día calendario en Argentina, "YYYY-MM-DD". */
export const dayKey = (iso: string | number | Date) => keyFmt.format(new Date(iso));

/** "YYYY-MM" del día en Argentina. */
export const monthKey = (iso: string | number | Date) => dayKey(iso).slice(0, 7);

export type CalendarDay = { key: string; day: number; inMonth: boolean };

/**
 * Semanas (lunes a domingo) que cubren el mes `ym` ("YYYY-MM"), incluyendo
 * los días del mes anterior/siguiente necesarios para completar las filas.
 */
export function monthGrid(ym: string): CalendarDay[][] {
  const [y, m] = ym.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const offset = (first.getUTCDay() + 6) % 7; // lunes = 0
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const weeks = Math.ceil((offset + daysInMonth) / 7);
  const out: CalendarDay[][] = [];
  for (let w = 0; w < weeks; w++) {
    const row: CalendarDay[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(Date.UTC(y, m - 1, 1 + w * 7 + d - offset));
      row.push({
        key: date.toISOString().slice(0, 10),
        day: date.getUTCDate(),
        inMonth: date.getUTCMonth() === m - 1,
      });
    }
    out.push(row);
  }
  return out;
}

/** Suma `n` meses a "YYYY-MM". */
export function addMonths(ym: string, n: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}

const monthNameFmt = new Intl.DateTimeFormat("es-AR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export function monthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const s = monthNameFmt.format(new Date(Date.UTC(y, m - 1, 1)));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Mes en curso en Argentina. */
export const currentMonth = () => monthKey(Date.now());
