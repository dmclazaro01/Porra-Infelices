# Porras Infelices · Mundial 2026 ⚽

Quiniela privada para el Mundial 2026 con 48 selecciones. Los jugadores predicen resultados de fase de grupos, eliminatorias y bonus, compitiendo por un bote en su grupo.

## Stack

- **Frontend:** Vite + JavaScript vanilla (sin framework)
- **Backend:** Supabase (auth, base de datos, edge functions)
- **Despliegue:** GitHub Pages

## Cómo funciona

Los jugadores inician sesión con usuario y contraseña (el email se genera automáticamente). Tras elegir grupo, pueden rellenar sus pronósticos:

1. **Grupos** — Predice el 1X2 de cada partido y ordena los equipos con desempates personalizados.
2. **Eliminatorias** — Una vez completados los grupos, se activa el bracket de 32 equipos para pronosticar ganadores ronda a ronda.
3. **Bonus** — Pronostica el máximo goleador y mejor jugador del torneo.

### Puntuación

| Concepto | Puntos |
|---|---|
| Clasificado acertado (1º o 2º) | +1 |
| Posición exacta (1º o 2º) | +1 extra |
| Orden completo del grupo | +1 extra |
| Resultado 1X2 acertado | +0,25 |
| Ganador de eliminatoria | +2 por acierto |
| Máx. goleador / Mejor jugador | +5 cada uno |

## Desarrollo local

```bash
npm install
npm run dev
```

Copia `.env.example` a `.env` y rellena las variables de Supabase.

## Despliegue

El despliegue se hace sobre la rama `gh-pages` con los assets ya compilados. Para actualizar:

```bash
npm run build
# Copiar dist/ a la rama gh-pages y pushear
```

## Supabase

El proyecto usa Supabase para:

- **Auth** — Inicio de sesión con usuario/contraseña 
- **Base de datos** — Profiles, predicciones, grupos, partidos, settings
- **Edge Functions** — `create-user` (creación de jugadores desde el panel admin), `sync-results` (sincronización automática de resultados reales)
