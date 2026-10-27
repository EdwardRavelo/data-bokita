# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Data Bokita: a Next.js 16 (App Router, React 19, Tailwind 4) site about Boca Juniors — fixtures, results, match detail, season stats, standings/knockout brackets, and official news. All UI text, code comments, commit messages and the README are in Spanish; keep it that way. `README.md` is the source of truth for data sources and fidelity rules — read it before changing anything in `lib/`.

## Commands

```bash
npm run dev                      # http://localhost:3000
npm test                         # vitest run (all tests, offline: uses tests/fixtures)
npx vitest run tests/espn.test.ts          # single file
npx vitest run -t "penales"                # tests whose name matches
npm run lint                     # eslint
npm run build
npm run verify                   # hits live ESPN: latest results + computed record vs. ESPN table (run before publishing)
npm run archive [-- 2024 2025]   # refresh data/archive/{year}.json from ESPN (default: current year)
```

## Architecture

**Layers**
- `lib/sources/` — external fetchers (`espn.ts`, `news.ts`). Every response is validated with `zod` and mapped to the app's own types. Fetchers return `Sourced<T>` (`{ok, data|error, source, fetchedAt}`) instead of throwing. Parsing functions (`parseSchedule`, `parseSummary`, `parseStandings`, …) are pure and exported so tests can run them on saved real responses in `tests/fixtures/`.
- `lib/domain/` — types and pure calculations (match result, record, scorers, series/aggregate, season summary). No I/O.
- `lib/archive.ts` — reads `data/archive/{year}.json` with `fs` at runtime (hence `outputFileTracingIncludes` in `next.config.ts`). `ARCHIVE_VERSION` must be bumped if the archive shape changes.
- `lib/data.ts` — the only thing pages should call. Merges live ESPN with the archive:
  - Past years come only from the archive; the current year (Argentina time, UTC-3) is live ESPN merged over archived matches.
  - When a live source fails it throws `SourceUnavailableError` rather than rendering an error, so ISR keeps serving the last good page (`app/error.tsx` only shows on a cold miss). During `next build` (`NEXT_PHASE`) it falls back to the archive instead.
  - Finished, archived matches take their detail from the archive; otherwise ESPN live.
- `scripts/archive.ts` — writes the archive (finished matches + details + tables), keeping previously archived data when a single fetch fails and writing nothing if the schedule fails. Run daily by `.github/workflows/archive.yml`, which runs `npm test` before committing; that commit triggers a Vercel deploy.

**Routing / caching**: season routes use optional catch-all `[[...temporada]]` (`/tablas`, `/tablas/2025`) with `yearParam()` and `seasonStaticParams()` from `lib/data.ts`. Caching is ISR via `export const revalidate` per page plus `fetch(..., { next: { revalidate } })` per request (finished match detail 1 day, live 60 s). `/partido/[id]` has empty `generateStaticParams` and renders on first request. Since ISR serves the stale page to the first visitor, `.github/workflows/refresh.yml` curls the main pages (hardcoded `SITE_URL`) every 12 h to trigger regeneration; add new top-level routes to its `paths` list.

## Fidelity rules (non-negotiable, see README)

- Never estimate or fill in data: missing → "Sin datos"; unmatched goal events → "sin autor" + match flagged incomplete; unresolved series → "En curso"/"Sin datos", never guess who advanced.
- Results are computed from the score (90'/120'); penalty shootouts count as a draw and are shown separately. Do not use ESPN's `winner` flag.
- Season stats exclude friendlies (`club.friendly`).
- Only free sources; news only from the official club site (via Google News RSS — the site's `robots.txt` forbids direct scraping), showing headline/date/link only.
- Images are `unoptimized` (ESPN CDN resized logos) to stay within Vercel's free image quota.
