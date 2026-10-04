import type { NewsItem } from "@/lib/domain/types";
import { formatDateTime } from "@/lib/format";
import { Card } from "./ui";

export function NewsList({ items }: { items: NewsItem[] }) {
  if (items.length === 0) {
    return <Card className="text-sm text-slate-300">No hay noticias oficiales recientes.</Card>;
  }
  return (
    <ul className="divide-y divide-navy-700 rounded-lg border border-navy-700 bg-navy-900">
      {items.map((n) => (
        <li key={n.url}>
          <a
            href={n.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block px-4 py-3 hover:bg-navy-800"
          >
            <span className="font-medium text-white">{n.title}</span>
            <span className="mt-1 block text-xs text-slate-400">
              {formatDateTime(n.publishedAt)} · Leer en bocajuniors.com.ar ↗
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
