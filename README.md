# Data Bokita

App web 100% Boca Juniors: próximos partidos, resultados, ficha de cada partido (goles, tarjetas,
cambios, estadísticas y formaciones), estadísticas de la temporada y noticias oficiales.

## Fuentes

| Dato | Fuente | Actualización |
| --- | --- | --- |
| Calendario y resultados | API pública de ESPN (`site.api.espn.com`, Boca = id 5) | 5 min |
| Detalle de partido | ESPN `summary?event=` | 1 min (en juego) / 24 h (finalizado) |
| Tabla Liga Profesional | ESPN `standings` | 10 min |
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

## Comandos

```bash
npm run dev      # desarrollo en http://localhost:3000
npm test         # tests con respuestas reales guardadas en tests/fixtures
npm run verify   # últimos resultados + récord calculado vs. tabla de ESPN (correr antes de publicar)
npm run build
```

## Estructura

- `lib/sources/` — acceso a ESPN y noticias (schemas + mapeo a tipos propios).
- `lib/domain/` — tipos y cálculos puros (resultado, récord, goleadores, promedios).
- `app/` — páginas: inicio, `partidos`, `partidos/[id]`, `estadisticas`, `noticias`.
- `components/` — tarjetas de partido, cuenta regresiva, UI común.

## Limitaciones

- La API de ESPN no es oficial ni documentada: puede cambiar sin aviso (la validación evita
  mostrar datos rotos, pero habría que adaptar `lib/sources/espn.ts`).
- Google News puede tardar en indexar una noticia oficial.
- Las fuentes gratuitas no incluyen métricas avanzadas (xG, puntajes de jugadores).
