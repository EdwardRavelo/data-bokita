import { describe, expect, it } from "vitest";
import { addMonths, dayKey, monthGrid, monthLabel } from "../lib/calendar";

describe("calendario", () => {
  it("ubica el partido en el día de Argentina, no en el de UTC", () => {
    // Boca-Unión: 03/10 00:30 UTC = viernes 02/10 21:30 en Argentina
    expect(dayKey("2026-10-03T00:30Z")).toBe("2026-10-02");
  });

  it("arma semanas de lunes a domingo que cubren el mes", () => {
    const weeks = monthGrid("2026-10"); // 1/10/2026 es jueves
    expect(weeks[0].map((d) => d.key)).toEqual([
      "2026-09-28",
      "2026-09-29",
      "2026-09-30",
      "2026-10-01",
      "2026-10-02",
      "2026-10-03",
      "2026-10-04",
    ]);
    expect(weeks[0][3]).toEqual({ key: "2026-10-01", day: 1, inMonth: true });
    const inMonth = weeks.flat().filter((d) => d.inMonth);
    expect(inMonth).toHaveLength(31);
    expect(weeks.at(-1)!.at(-1)!.key).toBe("2026-11-01");
  });

  it("navega meses cruzando el año", () => {
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(monthLabel("2026-10")).toBe("Octubre de 2026");
  });
});
