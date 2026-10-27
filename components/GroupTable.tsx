import { TeamLogo } from "@/components/ui";
import { BOCA_ID, type StandingsGroup } from "@/lib/domain/types";

/** Tabla de posiciones de un grupo, con la fila de Boca resaltada. */
export function GroupTable({ group }: { group: StandingsGroup }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-navy-700">
      <table className="w-full text-sm">
        <thead className="bg-navy-800 text-xs uppercase text-slate-400">
          <tr>
            <th className="px-2 py-2 text-left font-medium" colSpan={2}>
              {group.name}
            </th>
            {["PJ", "G", "E", "P", "GF", "GC", "DIF", "PTS"].map((h) => (
              <th key={h} className="px-2 py-2 text-right font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-navy-700 bg-navy-900 tabular-nums">
          {group.rows.map((r) => {
            const diff = r.goalsFor - r.goalsAgainst;
            return (
              <tr key={r.team.id} className={r.team.id === BOCA_ID ? "bg-gold-500/15 font-semibold" : ""}>
                <td className="w-8 px-2 py-1.5 text-right text-slate-400">{r.rank}</td>
                <td className="px-2 py-1.5">
                  <span className="flex items-center gap-2">
                    <TeamLogo team={r.team} size={18} />
                    <span className="truncate">{r.team.shortName}</span>
                  </span>
                </td>
                <td className="px-2 py-1.5 text-right">{r.played}</td>
                <td className="px-2 py-1.5 text-right">{r.won}</td>
                <td className="px-2 py-1.5 text-right">{r.drawn}</td>
                <td className="px-2 py-1.5 text-right">{r.lost}</td>
                <td className="px-2 py-1.5 text-right">{r.goalsFor}</td>
                <td className="px-2 py-1.5 text-right">{r.goalsAgainst}</td>
                <td className="px-2 py-1.5 text-right">
                  {diff > 0 ? "+" : ""}
                  {diff}
                </td>
                <td className="px-2 py-1.5 text-right font-semibold">{r.points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
