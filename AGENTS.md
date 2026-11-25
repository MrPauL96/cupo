# Cupo – guía para agentes de código (Cursor, Claude Code, etc.)

Monorepo:
- `backend/`: Spring Boot 3.5, Java 21, Maven, Spring AI 1.0 (Anthropic). Paquete `co.cupo`.
  - `parking/ParkingStore`: datos en memoria del piloto (cuadras, cupos, parqueaderos, destinos). Reemplazar por JPA + PostGIS.
  - `parking/RecommendationService`: fórmula de probabilidad y riesgo. Aquí entrará el modelo de predicción.
  - `agent/AgentService` + `agent/CupoTools`: agente con tool calling. Sin `ANTHROPIC_API_KEY` usa `askRules`.
  - `live/LiveUpdates`: WebSocket `/ws`, avisa cada cambio; las apps vuelven a pedir datos.
- `mobile/`: Expo (React Native, TypeScript). Ver `mobile/AGENTS.md`.
  - `src/api.ts` (tipos y cliente), `src/useLive.ts` (WebSocket), `src/voice.ts` (voz), `src/screens/*`.

Reglas:
- Textos de la interfaz y respuestas del agente en español de Colombia.
- El agente habla con alguien que está manejando: respuestas de máximo dos frases, sin listas.
- Mantener los tipos de `mobile/src/api.ts` sincronizados con los DTO de `ParkingController` y `AgentService`.
- No presentar datos simulados como reales: la UI muestra la nota de "datos de ejemplo".
