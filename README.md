# Data Bokita

App web 100% Boca Juniors: calendario y próximos partidos, resultados, ficha de cada partido
(goles, tarjetas, cambios, estadísticas y formaciones), estadísticas por temporada, tablas de
posiciones y llaves de todos los torneos, y noticias oficiales.

## Fuentes

| Dato | Fuente | Actualización |
| --- | --- | --- |
| Calendario y resultados | API pública de ESPN (`site.api.espn.com`, Boca = id 5) | 5 min |
| Detalle de partido | ESPN `summary?event=` | 1 min (en juego) / 24 h (finalizado) |
| Tablas de todos los torneos | ESPN `standings` (cada fase con `hasStandings`) | 10 min |
| Temporadas pasadas y partidos jugados | Archivo propio `data/archive/{año}.json` | a diario (GitHub Actions) |
| Noticias | Sitio oficial `bocajuniors.com.ar` vía RSS de Google News | 30 min |

El sitio oficial no se lee directamente porque su `robots.txt` lo prohíbe a bots. De las noticias
solo se muestra titular, fecha y link a la nota original.

## Reglas de fidelidad

- Nunca se estima un dato: si la fuente no lo trae se muestra "Sin datos".
- Cada respuesta externa se valida con `zod`; si el formato cambia, se muestra un aviso de error
  en vez de datos parciales.
- Cada sección muestra su fuente y la hora de consulta. Horarios en hora argentina.
- Resultados calculados desde el marcador (90'/120'); los penales cuentan como empate y se
  muestran aparte. No se usa el flag `winner` de ESPN, que en series ida/vuelta se refiere al
  partido y no a la llave.
- Si los eventos de gol de un partido no suman el marcador, los goles faltantes quedan
  "sin autor" y el partido se señala como incompleto.
- Las estadísticas de temporada excluyen amistosos.
- Llaves eliminatorias: se calcula el global de ida y vuelta y, si empata, se usa la tanda de
  penales informada. Si falta un partido o los penales, la llave queda "En curso" o
  "Sin datos": nunca se supone quién pasó.
- Si ESPN no responde al actualizar una página, se sigue mostrando la última versión buena
  (no se guarda el error en caché). Los escudos usan versiones achicadas del CDN de ESPN, sin
  consumir el cupo de optimización de imágenes de Vercel.

## Archivo propio

`npm run archive` baja de ESPN los partidos jugados, su detalle y las tablas, y los guarda
normalizados en `data/archive/{año}.json`. El workflow `.github/workflows/archive.yml` lo corre
todos los días a las 06:00 (hora argentina) y commitea solo si hubo cambios, lo que además
publica una nueva versión en Vercel. Así la historia queda versionada en GitHub aunque ESPN
cambie o borre datos.

- Si un partido no se puede bajar, se conserva lo ya archivado; si falla el calendario, no se
  escribe nada.
- Al archivar se compara el récord de Boca en cada tabla con el calculado desde los partidos y
  se avisa si no coinciden.
- Para sumar temporadas: `npm run archive 2023` (o desde GitHub → Actions → "Archivar
  partidos" → Run workflow).
- GitHub pausa los workflows programados tras 60 días sin actividad en el repo; si pasa,
  se reactiva desde la pestaña Actions.

## Comandos

```bash
npm run dev      # desarrollo en http://localhost:3000
npm test         # tests con respuestas reales guardadas en tests/fixtures
npm run verify   # últimos resultados + récord calculado vs. tabla de ESPN (correr antes de publicar)
npm run archive  # actualiza el archivo del año en curso (o: npm run archive 2024 2025)
npm run build
```

## Estructura

- `lib/sources/` — acceso a ESPN y noticias (schemas + mapeo a tipos propios).
- `lib/domain/` — tipos y cálculos puros (resultado, récord, goleadores, promedios).
- `app/` — páginas: inicio, `partidos/[año]`, `partido/[id]`, `estadisticas/[año]`,
  `tablas/[año]`, `noticias`.
- `data/archive/` — archivo de temporadas.
- `components/` — tarjetas de partido, cuenta regresiva, UI común.

## Limitaciones

- La API de ESPN no es oficial ni documentada: puede cambiar sin aviso (la validación evita
  mostrar datos rotos, pero habría que adaptar `lib/sources/espn.ts`).
- Google News puede tardar en indexar una noticia oficial.
- Las fuentes gratuitas no incluyen métricas avanzadas (xG, puntajes de jugadores).
