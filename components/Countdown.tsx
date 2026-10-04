"use client";

import { useSyncExternalStore } from "react";

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return {
    d: Math.floor(s / 86_400),
    h: Math.floor((s % 86_400) / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
  };
}

function subscribe(onTick: () => void) {
  const id = setInterval(onTick, 1000);
  return () => clearInterval(id);
}

/** Redondeado al segundo para que el valor sea estable entre lecturas. */
const getNow = () => Math.floor(Date.now() / 1000) * 1000;

export function Countdown({ to }: { to: string }) {
  const target = new Date(to).getTime();
  // En el servidor es null: así el HTML cacheado nunca muestra una cuenta vieja.
  const now = useSyncExternalStore(subscribe, getNow, () => null);

  if (now === null) return <div className="h-14" aria-hidden />;
  if (now >= target) return <p className="text-sm text-gold-400">El partido ya comenzó.</p>;

  const p = parts(target - now);
  const units: [number, string][] = [
    [p.d, "días"],
    [p.h, "hs"],
    [p.m, "min"],
    [p.s, "seg"],
  ];
  return (
    <div className="flex justify-center gap-3" aria-label="Cuenta regresiva">
      {units.map(([v, label]) => (
        <div key={label} className="w-14 rounded-md bg-navy-800 py-1 text-center">
          <div className="font-display text-2xl font-bold tabular-nums text-gold-400">
            {String(v).padStart(2, "0")}
          </div>
          <div className="text-[10px] uppercase text-slate-400">{label}</div>
        </div>
      ))}
    </div>
  );
}
