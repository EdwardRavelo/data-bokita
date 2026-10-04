import Image from "next/image";
import type { ReactNode } from "react";
import type { Result, Sourced, Team } from "@/lib/domain/types";
import { formatDateTime } from "@/lib/format";

export function TeamLogo({ team, size = 32 }: { team: Team; size?: number }) {
  if (!team.logo) {
    return (
      <span
        className="inline-flex shrink-0 items-center justify-center rounded-full bg-navy-700 text-[10px] font-bold"
        style={{ width: size, height: size }}
        aria-hidden
      >
        {team.abbreviation.slice(0, 3)}
      </span>
    );
  }
  return (
    <Image
      src={team.logo}
      alt=""
      width={size}
      height={size}
      className="shrink-0 object-contain"
    />
  );
}

export function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="mb-8">
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <h2 className="font-display text-xl font-bold uppercase tracking-wide text-gold-500">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-navy-700 bg-navy-900 p-4 ${className}`}>{children}</div>
  );
}

/** Indica de dónde sale cada dato y cuándo se consultó. */
export function SourceBadge({ data }: { data: Pick<Sourced<unknown>, "source" | "fetchedAt"> }) {
  return (
    <p className="mt-2 text-xs text-slate-400">
      Fuente: {data.source} · consultado {formatDateTime(data.fetchedAt)}
    </p>
  );
}

export function SourceError({ data }: { data: Extract<Sourced<unknown>, { ok: false }> }) {
  return (
    <Card className="border-red-900/60 bg-red-950/30 text-sm">
      <p className="font-medium text-red-200">No pudimos obtener estos datos de {data.source}.</p>
      <p className="mt-1 text-red-200/80">
        Preferimos no mostrar información incompleta. Probá de nuevo en unos minutos.
      </p>
      <p className="mt-2 text-xs text-red-200/60">Detalle: {data.error}</p>
    </Card>
  );
}

export function Notice({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-md border border-gold-600/40 bg-gold-500/10 px-3 py-2 text-sm text-gold-400">
      {children}
    </p>
  );
}

const RESULT_STYLE: Record<Result, { label: string; className: string }> = {
  W: { label: "G", className: "bg-emerald-600 text-white" },
  D: { label: "E", className: "bg-slate-500 text-white" },
  L: { label: "P", className: "bg-red-600 text-white" },
};

const RESULT_TITLE: Record<Result, string> = { W: "Ganó", D: "Empató", L: "Perdió" };

export function ResultBadge({ result }: { result: Result }) {
  const s = RESULT_STYLE[result];
  return (
    <span
      title={RESULT_TITLE[result]}
      className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-bold ${s.className}`}
    >
      {s.label}
    </span>
  );
}
