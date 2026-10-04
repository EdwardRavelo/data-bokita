"use client";

export default function ErrorPage({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className="rounded-lg border border-red-900/60 bg-red-950/30 p-6 text-center">
      <h1 className="font-display text-2xl font-bold uppercase text-red-200">
        No pudimos cargar los datos
      </h1>
      <p className="mt-2 text-sm text-red-200/80">
        La fuente no respondió. Preferimos no mostrar información incompleta.
      </p>
      <button
        type="button"
        onClick={() => retry()}
        className="mt-4 rounded-md bg-gold-500 px-4 py-2 text-sm font-semibold text-navy-950 hover:bg-gold-400"
      >
        Reintentar
      </button>
    </div>
  );
}
