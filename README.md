# Cupo · Valle de Aburrá (piloto)

Encuentra dónde parquear en Medellín. Hay dos apps conectadas en tiempo real y un agente de voz:

- **Conductor:** mapa de cupos libres y ocupados, recomendaciones con probabilidad de cupo y riesgo (lluvia + árboles, inseguridad), y un agente al que le hablas: *"Voy para el Primer Parque, llego en 10 minutos"*.
- **Auxiliar de zona:** el auxiliar de la Alcaldía marca el cupo al cobrar y al instante aparece en el mapa del conductor.

**Zonas del piloto:** Laureles, El Poblado, Envigado e Itagüí. Cada zona tiene cupos públicos en la calle (zona regulada)
y parqueaderos privados. El agente siempre da la mejor opción **y un plan B del otro tipo**, con un indicador de
**tranquilidad** (probabilidad de parquear entre las dos). En los privados se puede **apartar el cupo 15 min**.

**Casos de demo** (botón "Prueba un caso" en la app, o `POST /api/demo/scenarios/{id}`):

| Caso | Qué muestra |
|---|---|
| `lluvia-laureles` · Aguacero en Laureles | Gana el privado cubierto: no te deja bajo los árboles |
| `domingo-envigado` · Domingo en Envigado | Gana la calle: hay cupo al lado del parque y es más económica |
| `viernes-provenza` · Viernes de noche en Provenza | Gana el privado: calle llena y de noche es más seguro |
| `pico-itagui` · Hora pico en Itagüí | Todo apretado: propone apartar el cupo |
| `upb-temprano` · Clase temprano en la UPB | Gana la calle: a esa hora hay cupo frente a la universidad |

`POST /api/demo/reset` vuelve a los datos en vivo.

```
cupo/
├── backend/   Spring Boot 3.5 + Java 21 + Spring AI (Claude con tool calling)
└── mobile/    React Native + Expo (TypeScript)
```

> Todos los datos son de ejemplo: cupos, placas, parqueaderos, tarifas y coordenadas (aproximadas).
> La predicción todavía es una fórmula simple, no un modelo entrenado.

---

## 1. Backend

Requisitos: Java 21 y Maven (o ábrelo en IntelliJ / Cursor como proyecto Maven).

```bash
cd backend
mvn spring-boot:run
```

Queda en `http://localhost:8080`. Pruébalo: `http://localhost:8080/api/zones`

**Agente con IA (opcional).** Sin clave, el agente responde con reglas simples y la demo funciona igual. Para que responda Claude:

```bash
# macOS / Linux
ANTHROPIC_API_KEY=sk-ant-... mvn spring-boot:run
# Windows PowerShell
$env:ANTHROPIC_API_KEY="sk-ant-..."; mvn spring-boot:run
```

La clave se saca en console.anthropic.com y cobra por uso. Con el modelo Haiku, cada pregunta cuesta muy poco.
En los logs verás `Agente Cupo en modo IA (Claude)` o `modo reglas`.

### API

| Método | Ruta | Para qué |
|---|---|---|
| GET | `/api/zones` | Cuadras con sus cupos (ocupado, placa, minutos, alerta, coordenadas) |
| GET | `/api/lots` | Parqueaderos privados y cupos libres |
| GET | `/api/destinations` | Destinos del piloto |
| GET | `/api/recommendations?destination=0&eta=10&rain=true` (destination = id) | Mejores opciones ordenadas |
| GET | `/api/weather` | ¿Se espera lluvia? (Open-Meteo) |
| POST | `/api/zones/{z}/spots/{i}/occupy` `{"plate":"ABC123"}` | Auxiliar: inicia cobro |
| POST | `/api/zones/{z}/spots/{i}/release` | Auxiliar: libera y devuelve el cobro |
| POST | `/api/lots/{id}/entry` · `/exit` | Talanquera del parqueadero |
| POST | `/api/lots/{id}/reserve` | Apartar un cupo 15 min |
| GET | `/api/demo/scenarios` | Casos de demo |
| POST | `/api/demo/scenarios/{id}` · `/api/demo/reset` | Activar caso / volver a datos en vivo |
| POST | `/api/agent` `{"text":"voy a la UPB en 15 minutos","history":[]}` | Agente de voz |
| WS | `/ws` | Aviso en vivo de cada cambio |

Un simulador mueve las talanqueras cada 5 s (`cupo.simulator.enabled` en `application.properties`).

---

## 2. App móvil

Requisitos: Node 20+ y la app **Expo Go** en tu celular. El celular y el PC tienen que estar en la misma red WiFi.

```bash
cd mobile
npm install
cp .env.example .env     # y pon la IP de tu PC (ipconfig en Windows, ifconfig en Mac/Linux)
npx expo start
```

Escanea el QR con Expo Go (Android) o con la cámara (iPhone).

`EXPO_PUBLIC_API_URL` debe ser algo como `http://192.168.1.50:8080`. **No uses `localhost`**: en el celular, localhost es el celular.

### Probar sin backend

`EXPO_PUBLIC_API_URL=mock npx expo start --web` abre la app en el navegador con datos y agente simulados (el mapa se ve esquemático en web).

### La voz

- **En Expo Go:** la app lee las respuestas en voz alta, pero el reconocimiento de voz nativo no viene incluido. Escribe la frase o usa el micrófono del teclado del celular.
- **Con voz completa (botón de micrófono):** hay que hacer un *development build*:
  - Android con Android Studio instalado: `npx expo run:android`
  - Sin instalar nada, en la nube: `npx eas-cli@latest build --profile development --platform android`

Después de que el agente recomienda un lugar, decir **"sí"**, **"dale"** o **"llévame"** abre Waze con la ruta.

---

## Desplegar para la demo (link para cualquiera)

**0. Subir a GitHub**
```bash
cd cupo
git init && git add . && git commit -m "Cupo: piloto"
git branch -M main
git remote add origin https://github.com/MrPauL96/cupo.git   # crea antes el repo vacío "cupo" en GitHub
git push -u origin main
```

**1. Backend en Railway** (usa `backend/Dockerfile`)
1. railway.com → *New Project → Deploy from GitHub repo* → `cupo`.
2. *Settings → Root Directory*: `backend`.
3. *Variables*: `ANTHROPIC_API_KEY` (solo aquí, nunca en el código).
4. *Settings → Networking → Generate Domain*. Prueba `https://TU-BACKEND/api/zones`.

**2. Front web en Vercel** (usa `mobile/vercel.json`)
1. vercel.com → *Add New → Project* → importa `cupo`.
2. *Root Directory*: `mobile`.
3. *Environment Variables*: `EXPO_PUBLIC_API_URL` = `https://TU-BACKEND` (sin `/` al final).
4. *Deploy*. Te da un link `https://cupo-xxxx.vercel.app` para compartir.

Si el backend falla, pon `EXPO_PUBLIC_API_URL=mock` y vuelve a desplegar: la web funciona con datos y agente simulados.
En la web el mapa es esquemático; el micrófono funciona en Chrome (computador y Android). En la app del celular (Expo Go o APK) el mapa es real.

**APK para Android (sin portátil, con micrófono nativo):**
1. Crea una cuenta gratis en expo.dev y en `mobile/` corre `npx eas-cli@latest login`.
2. En `mobile/eas.json` cambia `EXPO_PUBLIC_API_URL` por la URL de Railway (o `mock` para datos simulados).
3. `npx eas-cli@latest build -p android --profile preview` → a todo lo que pregunte, **sí**.
4. Cuando termine (15 min a 1 h según la cola), abre el enlace/QR en el Android, descarga e instala
   (acepta "instalar apps de fuentes desconocidas").

Con `EXPO_PUBLIC_MAP=esquema` (ya puesto en `eas.json`) el APK usa el mapa dibujado y **no necesita API key de Google Maps**.
Para el mapa real de Google: quita esa variable y pon tu API key en `app.json` → `android.config.googleMaps.apiKey`.

**App con Expo Go (sin compilar):** `mobile/.env` con la URL del backend y `npx expo start`.

---

## 3. Cómo está armado el agente

1. El celular convierte la voz en texto (`mobile/src/voice.ts`).
2. Envía el texto a `POST /api/agent` con los últimos turnos de la conversación.
3. `AgentService` usa Spring AI con Claude. El modelo llama las herramientas de `CupoTools`:
   - `buscarOpciones(destino, minutosParaLlegar)`: ocupación en vivo, predicción, clima y riesgo.
   - `listarDestinos()`
4. Claude responde en una o dos frases, y la app lo lee en voz alta y marca la opción en el mapa.

Para agregarle capacidades al agente, agrega un método con `@Tool` en `CupoTools`. Por ejemplo, reservar un cupo o comparar tarifas.

---

## 4. Siguientes pasos sugeridos

1. PostgreSQL + PostGIS en lugar de los datos en memoria (`ParkingStore`).
2. Coordenadas reales de las cuadras de Laureles y del inventario de árboles (datos abiertos de Medellín).
3. Guardar el histórico de ocupación y entrenar el modelo de predicción (`RecommendationService`).
4. Login para auxiliares y parqueaderos.
5. Android Auto / CarPlay para usarlo sin tocar el celular.
