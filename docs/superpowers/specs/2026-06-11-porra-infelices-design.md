# Porras Infelices — Design Spec

## Resumen

Copia funcional de https://porra.iamyipi.net (porra del Mundial 2026) con sistema de puntuacion simplificado, desplegada en GitHub Pages con Supabase como backend.

## Arquitectura

- **Frontend**: SPA en JavaScript vanilla, construido con Vite, desplegado en GitHub Pages.
- **Backend**: Supabase (PostgreSQL + Auth + Realtime).
- **Datos estaticos**: Equipos, grupos y calendario de partidos se seedean en Supabase.
- **Resultados**: Actualizados por admin manualmente o via Supabase Edge Function que sincroniza con una API de futbol.

## Modelo de Datos (Supabase)

### Tablas principales

| Tabla | Campos clave | Proposito |
|---|---|---|
| `profiles` | id (ref auth.users), name, group_name, role (admin/player), is_active, has_paid | Usuarios con su grupo y rol |
| `player_groups` | name | Grupos/penas disponibles |
| `teams` | id, name, code, flag | 48 selecciones |
| `groups_t` | letter, team_ids | 12 grupos (A-L) |
| `matches` | id, group_letter, round, stage, home_team_id, away_team_id, home_label, away_label, kickoff_at, status, actual_home_score, actual_away_score, actual_winner_team_id, odds_home_decimal, odds_draw_decimal, odds_away_decimal, match_number | Todos los partidos |
| `group_predictions` | id, user_id, match_id, prediction (1/X/2) | Predicciones 1-X-2 |
| `tiebreak_predictions` | id, user_id, group_letter, team_order (array) | Desempates manuales |
| `knockout_predictions` | id, user_id, match_number, winner_team_id | Bracket de eliminatorias |
| `bonus_predictions` | id, user_id, top_scorer, best_player | Pichichi + MVP |
| `settings` | lock_deadline, locked, entry_fee | Config global |
| `sync_log` | last_sync_at | Control de sincronizacion |

### Row Level Security (RLS)

- Los jugadores solo pueden escribir sus propias predicciones.
- Las predicciones de otros solo son legibles tras el cierre (lock).
- El admin puede leer/escribir todo.
- Los resultados de partidos son publicos.

## Sistema de Puntuacion

### Fase de Grupos

Por cada grupo, el usuario predice 1/X/2 para los 6 partidos. Con eso se calcula la clasificacion predicha. Si hay empate a puntos, el usuario puede reordenar con flechas.

| Acierto | Puntos |
|---|---|
| Equipo acertado como clasificado (predicho 1º o 2º y realmente entre los 2 primeros) | +1 |
| Posicion exacta correcta (1º como 1º, o 2º como 2º) | +1 extra |
| Tercero clasificado acertado (predicho como 3º y es uno de los 8 mejores terceros que clasifican) | +1 |

**Calculo por grupo**: maximo 4 pts (2 x clasificado + 2 x posicion exacta).
**Mejores terceros**: maximo 8 pts (8 de 12 terceros clasifican).
**Total grupos**: 48 clasificados + 48 posicion exacta potencial + 8 terceros = **56 pts maximo**.

### Eliminatorias

| Acierto | Puntos |
|---|---|
| Ganador de partido de eliminatoria acertado | +1 (fijo, sin importar ronda) |

**Total eliminatorias**: 26 partidos = **26 pts maximo**.

### Bonus

| Acierto | Puntos |
|---|---|
| Pichichi (maximo goleador) acertado | +5 |
| MVP (mejor jugador) acertado | +5 |

**Total bonus**: **10 pts maximo**.

### Puntuacion Total Maxima: 92 puntos

## Bote

- Entrada: 2€ por persona.
- Reparto: 2º clasificado se lleva su apuesta (2€), 1º se lleva el resto.
- Admin marca quien ha pagado (como en la original).

## Auth y Usuarios

- Supabase Auth con email/password.
- Flow: admin crea cuentas → jugador se loguea → elige grupo → hace predicciones.
- Roles: `admin` (gestionar jugadores, resultados, pagos) y `player` (hacer predicciones).

## Funcionalidades (de la original que se mantienen)

1. Login con nombre + contrasena
2. Eleccion de grupo al primer login
3. Pestana de grupos: prediccion 1/X/2, clasificacion calculada, desempate manual
4. Pestana de eliminatorias: bracket completo (16avos a final + 3er puesto)
5. Pestana de bonus: pichichi + MVP
6. Pestana de resultados: marcadores reales, en vivo
7. Pestana de clasificacion: ranking + bote + reparto
8. Pestana de quinielas: prediccion de otros (bloqueada hasta el cierre)
9. Pestana de reglas (adaptadas al nuevo scoring)
10. Panel de admin: gestionar jugadores, pagos, resultados, configuracion

## Funcionalidades que cambian

- **Scoring**: nuevo sistema simplificado (sin cuotas, puntos fijos)
- **Cuotas**: se muestran como informacion en la UI pero NO afectan puntuacion
- **Bote**: 2€/persona, reparto 1º=resto, 2º=su apuesta
- **Backend**: Supabase en vez de servidor propio

## Estructura del Proyecto

```
porras-infelices/
  src/
    main.js              - Entry point, inicializa app
    api.js               - Cliente Supabase (auth, DB, realtime)
    auth.js              - Login, registro, gestion de sesion
    scoring.js           - Logica de puntuacion (nuevo sistema)
    state.js             - Estado global de la app
    render/
      login.js           - Pantalla de login
      groups.js          - Pestana de grupos
      knockout.js        - Pestana de eliminatorias
      bonus.js           - Pestana de bonus
      results.js         - Pestana de resultados
      leaderboard.js     - Pestana de clasificacion
      rules.js           - Pestana de reglas
      picks.js           - Pestana de quinielas publicas
      admin.js           - Panel de admin
    utils.js             - Formateo, helpers
  static/
    img/                 - Iconos, imagenes
    styles.css           - Estilos (basado en el CSS original, tema Dell-1996)
  index.html
  vite.config.js
  package.json
```

## Deploy

- `vite build` genera `dist/`
- GitHub Actions deploy a GitHub Pages
- Dominio custom opcional

## Seed Data

- 48 equipos con banderas (emoji o SVG)
- 12 grupos (A-L) con 4 equipos cada uno
- Calendario de partidos (78 de grupo + eliminatorias)
- Configuracion: lock_deadline, grupos de jugadores

## Consideraciones

- Las cuotas se muestran en la UI como informacion pero no se usan para puntuar
- El desempate manual (flechas) se mantiene igual que la original
- El bracket de eliminatorias se calcula a partir de la clasificacion predicha de grupos
- La pestana de quinielas publicas se desbloquea automaticamente al cierre
- Los resultados se actualizan periodicamente (Supabase Realtime o polling cada 60s)