import type { Metadata } from "next";
import { Barlow_Condensed, Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const barlow = Barlow_Condensed({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  title: { default: "Data Bokita", template: "%s · Data Bokita" },
  description: "Partidos, estadísticas y noticias oficiales de Boca Juniors.",
};

const NAV = [
  { href: "/", label: "Inicio" },
  { href: "/partidos", label: "Partidos" },
  { href: "/estadisticas", label: "Estadísticas" },
  { href: "/noticias", label: "Noticias" },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-AR" className={`${inter.variable} ${barlow.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <header className="border-b-4 border-gold-500 bg-navy-900">
          <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3">
            <Link href="/" className="font-display text-2xl font-bold tracking-wide text-gold-500">
              DATA BOKITA
            </Link>
            <nav className="flex gap-4 text-sm font-medium">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="text-slate-200 hover:text-gold-400">
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">{children}</main>
        <footer className="border-t border-navy-700 px-4 py-6 text-center text-xs text-slate-400">
          <p>
            Datos de partidos: ESPN. Noticias: sitio oficial bocajuniors.com.ar (vía Google News).
          </p>
          <p className="mt-1">
            Sitio no oficial de hinchas. Horarios en hora de Argentina. Si un dato no está en la
            fuente, se indica &quot;Sin datos&quot; en lugar de estimarlo.
          </p>
        </footer>
      </body>
    </html>
  );
}
