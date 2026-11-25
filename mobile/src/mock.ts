// Backend simulado DENTRO de la app, para la vista previa web (EXPO_PUBLIC_API_URL=mock).
// Copia de la lógica de Spring Boot: mismos datos de ejemplo, misma fórmula, casos de demo y agente por reglas.
import type { AgentReply, Destination, Lot, Option, Scenario, Spot, Turn, Zone } from './api';

type RawZone = { id: number; area: string; name: string; a: [number, number]; b: [number, number]; trees: boolean; insec: number; n: number };
type RawSpot = { occupied: boolean; plate: string | null; since: number };
type RawLot = Lot & { used: number };

const MIN = 60_000;
const L = 'ABCDEFGHJKLMNPRSTUVWXYZ';
const plate = () => Array.from({ length: 3 }, () => L[(Math.random() * L.length) | 0]).join('') + (100 + ((Math.random() * 900) | 0));

// ---------- Datos de ejemplo (referencias de ubicación reales, cupos inventados) ----------
const RZ: RawZone[] = [
  { id: 0, area: 'laureles', name: 'Cra. 70 entre Cl. 44 y Cq. 1', a: [6.2484, -75.5889], b: [6.246, -75.5892], trees: false, insec: 0.3, n: 8 },
  { id: 1, area: 'laureles', name: 'Costado norte del Primer Parque', a: [6.2466, -75.5929], b: [6.2466, -75.5942], trees: true, insec: 0.15, n: 8 },
  { id: 2, area: 'laureles', name: 'Av. Nutibara con Cq. 4', a: [6.2447, -75.595], b: [6.246, -75.5962], trees: true, insec: 0.2, n: 10 },
  { id: 3, area: 'laureles', name: 'Av. 33 con Cra. 76', a: [6.2391, -75.5959], b: [6.2393, -75.594], trees: false, insec: 0.45, n: 8 },
  { id: 4, area: 'laureles', name: 'Cra. 76, Segundo Parque', a: [6.2438, -75.5966], b: [6.2455, -75.5966], trees: true, insec: 0.2, n: 6 },
  { id: 5, area: 'laureles', name: 'Cq. 1 frente a la UPB', a: [6.2439, -75.5899], b: [6.243, -75.5905], trees: true, insec: 0.15, n: 8 },
  { id: 10, area: 'poblado', name: 'Cl. 10 entre Av. El Poblado y Cra. 37', a: [6.2103, -75.5697], b: [6.2094, -75.5674], trees: false, insec: 0.35, n: 10 },
  { id: 11, area: 'poblado', name: 'Cra. 37, Parque Lleras', a: [6.2099, -75.5667], b: [6.2083, -75.5668], trees: true, insec: 0.4, n: 8 },
  { id: 12, area: 'poblado', name: 'Cra. 35, Provenza', a: [6.2095, -75.5656], b: [6.2079, -75.5657], trees: true, insec: 0.45, n: 8 },
  { id: 13, area: 'poblado', name: 'Av. El Poblado junto al parque', a: [6.2113, -75.5707], b: [6.2097, -75.5706], trees: false, insec: 0.3, n: 8 },
  { id: 20, area: 'envigado', name: 'Cl. 38 Sur junto al parque', a: [6.1699, -75.588], b: [6.1699, -75.5866], trees: true, insec: 0.15, n: 8 },
  { id: 21, area: 'envigado', name: 'Cra. 43A con Cl. 37 Sur', a: [6.1718, -75.5885], b: [6.1705, -75.5884], trees: false, insec: 0.2, n: 8 },
  { id: 22, area: 'envigado', name: 'Cl. 36 Sur', a: [6.1722, -75.588], b: [6.1722, -75.5866], trees: false, insec: 0.15, n: 6 },
  { id: 30, area: 'itagui', name: 'Junto al Parque Obrero', a: [6.1716, -75.6126], b: [6.1716, -75.6109], trees: true, insec: 0.3, n: 8 },
  { id: 31, area: 'itagui', name: 'Cuadra oriental del parque', a: [6.1712, -75.6103], b: [6.1726, -75.6103], trees: false, insec: 0.35, n: 6 },
  { id: 32, area: 'itagui', name: 'Hacia la Cl. 51', a: [6.1722, -75.6098], b: [6.1722, -75.6086], trees: false, insec: 0.3, n: 8 },
];
const spots: Record<number, RawSpot[]> = {};
const randomize = () => RZ.forEach((z) => {
  spots[z.id] = Array.from({ length: z.n }, () =>
    Math.random() < 0.72 ? { occupied: true, plate: plate(), since: Date.now() - (10 + Math.random() * 100) * MIN } : { occupied: false, plate: null, since: 0 });
});
randomize();
spots[1][2] = { occupied: true, plate: 'KLM482', since: Date.now() - (9 * 60 + 12) * MIN };

const LOTS0: RawLot[] = [
  { id: 0, area: 'laureles', name: 'Parqueadero La 70 (cubierto)', lat: 6.2474, lng: -75.5884, capacity: 40, used: 37, free: 0, covered: true },
  { id: 1, area: 'laureles', name: 'Parqueadero Nutibara (descubierto)', lat: 6.2443, lng: -75.5941, capacity: 25, used: 25, free: 0, covered: false },
  { id: 2, area: 'laureles', name: 'Parqueadero Av. 33 (cubierto)', lat: 6.2398, lng: -75.5951, capacity: 60, used: 44, free: 0, covered: true },
  { id: 3, area: 'laureles', name: 'Parqueadero Cq. 1 (cubierto)', lat: 6.2424, lng: -75.5884, capacity: 50, used: 31, free: 0, covered: true },
  { id: 4, area: 'laureles', name: 'Parqueadero Cq. 4 (cubierto)', lat: 6.2462, lng: -75.5919, capacity: 30, used: 26, free: 0, covered: true },
  { id: 10, area: 'poblado', name: 'Parqueadero Lleras (cubierto)', lat: 6.2093, lng: -75.5684, capacity: 80, used: 66, free: 0, covered: true },
  { id: 11, area: 'poblado', name: 'Parqueadero Provenza (cubierto)', lat: 6.2082, lng: -75.5648, capacity: 45, used: 38, free: 0, covered: true },
  { id: 12, area: 'poblado', name: 'Parqueadero Cl. 10 (descubierto)', lat: 6.21, lng: -75.569, capacity: 30, used: 22, free: 0, covered: false },
  { id: 20, area: 'envigado', name: 'Parqueadero del parque (cubierto)', lat: 6.1712, lng: -75.5862, capacity: 40, used: 30, free: 0, covered: true },
  { id: 21, area: 'envigado', name: 'Parqueadero Cl. 39 Sur (descubierto)', lat: 6.169, lng: -75.5878, capacity: 25, used: 15, free: 0, covered: false },
  { id: 30, area: 'itagui', name: 'Parqueadero Parque Obrero (cubierto)', lat: 6.1728, lng: -75.6114, capacity: 35, used: 28, free: 0, covered: true },
  { id: 31, area: 'itagui', name: 'Parqueadero Cra. 52 (descubierto)', lat: 6.1704, lng: -75.6099, capacity: 30, used: 20, free: 0, covered: false },
];
const lots: RawLot[] = LOTS0.map((l) => ({ ...l }));

const dests: (Destination & { aliases: string[] })[] = [
  { id: 0, area: 'laureles', name: 'Primer Parque de Laureles', aliases: ['primer parque', 'parque de laureles'], lat: 6.2458, lng: -75.5935 },
  { id: 1, area: 'laureles', name: 'UPB', aliases: ['upb', 'bolivariana'], lat: 6.2421, lng: -75.5895 },
  { id: 2, area: 'laureles', name: 'La 70 con Cl. 44', aliases: ['la 70', 'setenta', 'san juan'], lat: 6.2492, lng: -75.5888 },
  { id: 3, area: 'laureles', name: 'Segundo Parque de Laureles', aliases: ['segundo parque'], lat: 6.2447, lng: -75.5969 },
  { id: 4, area: 'laureles', name: 'Unicentro', aliases: ['unicentro'], lat: 6.2411, lng: -75.587 },
  { id: 10, area: 'poblado', name: 'Parque Lleras', aliases: ['lleras'], lat: 6.209, lng: -75.568 },
  { id: 11, area: 'poblado', name: 'Provenza', aliases: ['provenza'], lat: 6.2087, lng: -75.5656 },
  { id: 12, area: 'poblado', name: 'Parque de El Poblado', aliases: ['parque del poblado', 'parque de el poblado', 'poblado'], lat: 6.2103, lng: -75.571 },
  { id: 20, area: 'envigado', name: 'Parque de Envigado', aliases: ['envigado'], lat: 6.17, lng: -75.5874 },
  { id: 21, area: 'envigado', name: 'Cra. 43A con Cl. 37 Sur', aliases: ['43a', '37 sur'], lat: 6.1711, lng: -75.5883 },
  { id: 30, area: 'itagui', name: 'Parque Obrero de Itagüí', aliases: ['itagui', 'parque obrero'], lat: 6.172, lng: -75.6117 },
  { id: 31, area: 'itagui', name: 'Cl. 51 con Cra. 50, Itagüí', aliases: ['calle 51', 'cl 51'], lat: 6.1722, lng: -75.6089 },
];

// ---------- Casos de demo ----------
type ScenarioData = Scenario & { hour: number; zonesFree: Record<number, number>; lotsUsed: Record<number, number> };
const SCENARIOS: ScenarioData[] = [
  { id: 'lluvia-laureles', title: 'Aguacero en Laureles', when: 'Jueves 3:00 p. m.', area: 'laureles', destination: 0, eta: 10, rain: true,
    say: 'Voy para el Primer Parque, llego en 10 minutos y está lloviendo', lesson: 'Gana el privado cubierto: no te dejo bajo los árboles',
    hour: 15, zonesFree: { 0: 1, 1: 4, 2: 5, 3: 2, 4: 3, 5: 2 }, lotsUsed: { 0: 38, 1: 25, 2: 40, 3: 35, 4: 24 } },
  { id: 'domingo-envigado', title: 'Domingo en Envigado', when: 'Domingo 10:00 a. m.', area: 'envigado', destination: 20, eta: 10, rain: false,
    say: 'Voy al parque de Envigado, llego en 10 minutos', lesson: 'Gana la calle: hay cupo al lado del parque y es más económica',
    hour: 10, zonesFree: { 20: 5, 21: 4, 22: 4 }, lotsUsed: { 20: 30, 21: 10 } },
  { id: 'viernes-provenza', title: 'Viernes de noche en Provenza', when: 'Viernes 8:00 p. m.', area: 'poblado', destination: 11, eta: 15, rain: false,
    say: 'Voy para Provenza, llego en 15 minutos', lesson: 'Gana el privado: la calle está llena y de noche es más seguro',
    hour: 20, zonesFree: { 10: 0, 11: 1, 12: 0, 13: 1 }, lotsUsed: { 10: 70, 11: 43, 12: 30 } },
  { id: 'pico-itagui', title: 'Hora pico en Itagüí', when: 'Martes 6:00 p. m.', area: 'itagui', destination: 30, eta: 10, rain: false,
    say: 'Voy al Parque Obrero de Itagüí, llego en 10 minutos', lesson: 'Todo está apretado: Cupo te propone apartar el cupo ya',
    hour: 18, zonesFree: { 30: 1, 31: 0, 32: 1 }, lotsUsed: { 30: 33, 31: 29 } },
  { id: 'upb-temprano', title: 'Clase temprano en la UPB', when: 'Lunes 6:40 a. m.', area: 'laureles', destination: 1, eta: 10, rain: false,
    say: 'Voy para la UPB, llego en 10 minutos', lesson: 'Gana la calle: a esta hora hay cupo frente a la universidad',
    hour: 6.67, zonesFree: { 0: 5, 1: 3, 2: 4, 3: 3, 4: 2, 5: 6 }, lotsUsed: { 0: 20, 1: 10, 2: 30, 3: 12, 4: 14 } },
];
let simHour: number | null = null;

// ---------- eventos "en vivo" ----------
type Listener = (e: { at: string; message: string }) => void;
const listeners = new Set<Listener>();
export const subscribe = (l: Listener) => { listeners.add(l); return () => { listeners.delete(l); }; };
const emit = (message: string) => listeners.forEach((l) => l({ at: new Date().toISOString(), message }));
setInterval(() => {
  if (simHour !== null) return; // en un caso de demo no movemos los datos
  const l = lots[(Math.random() * lots.length) | 0];
  const entry = Math.random() < 0.5;
  if (entry && l.used < l.capacity) l.used++;
  else if (!entry && l.used > 0) l.used--;
  else return;
  emit(`Talanquera ${l.name.split(' (')[0]}: ${entry ? 'entrada' : 'salida'}.`);
}, 5000);

// ---------- helpers ----------
const mins = (s: RawSpot) => (s.occupied ? Math.round((Date.now() - s.since) / MIN) : 0);
const fee = (m: number) => Math.max(1, Math.ceil(m / 30)) * 1000;
const norm = (t: string) => t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const DEMAND = [.2, .15, .1, .1, .1, .15, .35, .6, .8, .85, .85, .9, .95, .9, .85, .85, .85, .9, .95, .95, .85, .7, .5, .3];
const demand = (h: number) => { h = ((h % 24) + 24) % 24; const a = h | 0, b = (a + 1) % 24; return DEMAND[a] + (DEMAND[b] - DEMAND[a]) * (h - a); };
const sig = (x: number) => 1 / (1 + Math.exp(-x));
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const walk = (lat: number, lng: number, d: Destination) => {
  const R = 6371000, dLat = ((d.lat - lat) * Math.PI) / 180, dLng = ((d.lng - lng) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat * Math.PI) / 180) * Math.cos((d.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return Math.max(1, Math.round((2 * R * Math.asin(Math.sqrt(a))) / 80));
};
const findDest = (text: string) => {
  const t = norm(text);
  return dests.find((d) => t.includes(norm(d.name)) || d.aliases.some((a) => t.includes(a)));
};
const nowHour = () => { if (simHour !== null) return simHour; const n = new Date(); return n.getHours() + n.getMinutes() / 60; };
const strip = <T extends { aliases?: string[] }>({ aliases, ...d }: T) => d;

function zonesDto(): Zone[] {
  return RZ.map((z) => {
    const list: Spot[] = spots[z.id].map((s, i) => {
      const t = (i + 0.5) / z.n, m = mins(s);
      return { index: i, occupied: s.occupied, plate: s.plate, minutes: m, anomaly: s.occupied && m > 240,
        estimatedFee: s.occupied ? fee(m) : 0, lat: z.a[0] + (z.b[0] - z.a[0]) * t, lng: z.a[1] + (z.b[1] - z.a[1]) * t };
    });
    return { id: z.id, area: z.area, name: z.name, bigTrees: z.trees, free: list.filter((s) => !s.occupied).length, total: z.n, spots: list };
  });
}
const lotsDto = (): Lot[] => lots.map(({ used, ...l }) => ({ ...l, free: l.capacity - used }));

/** Misma fórmula que RecommendationService.java (simplificada, no es un modelo entrenado). */
function recommend(d: Destination, eta: number, rain: boolean): Option[] {
  const h = nowHour(), later = demand(h + eta / 60), shift = later - demand(h);
  const pressure = 0.004 * eta * later; // carros que llegan mientras vas en camino
  const night = h >= 19 || h < 6;
  const out: (Option & { score: number })[] = [];
  const push = (o: Omit<Option, 'riskLevel'> & { risk: number }) => {
    const riskLevel = o.risk >= 0.5 ? 'alto' : o.risk >= 0.25 ? 'medio' : 'bajo';
    // Privado cuesta más: solo compensa con lluvia, de noche o si la calle no da
    const pricePenalty = o.kind === 'parqueadero' && !rain && !night ? 18 : 0;
    out.push({ ...o, riskLevel, score: o.probability - o.risk * 70 - o.walkMinutes * (rain ? 9 : 6) - pricePenalty });
  };
  RZ.filter((z) => z.area === d.area).forEach((z) => {
    const free = spots[z.id].filter((s) => !s.occupied).length, occ = z.n - free;
    const p = clamp(sig(1.4 * (free + occ * 0.05 * eta / 10 - shift * z.n * 1.2 - z.n * 7.5 * pressure - 0.6)), 0.03, 0.97);
    const lat = (z.a[0] + z.b[0]) / 2, lng = (z.a[1] + z.b[1]) / 2;
    let risk = z.insec * (night ? 1.3 : 0.6); const reasons: string[] = [];
    if (night && z.insec >= 0.35) reasons.push('De noche: reportes de inseguridad');
    if (rain && z.trees) { risk += 0.5; reasons.push('Árboles grandes: riesgo de ramas con lluvia'); } else if (z.trees) reasons.push('Sombra de árboles');
    if (!rain && !night) reasons.push('Más económica');
    push({ id: 'zona-' + z.id, kind: 'zona', name: z.name, detail: `Pública · zona regulada en la calle · ${free} libres`, lat, lng,
      probability: Math.round(p * 100), freeNow: free, walkMinutes: walk(lat, lng, d), risk, reasons });
  });
  lots.filter((l) => l.area === d.area).forEach((l) => {
    const free = l.capacity - l.used, p = clamp(sig(1.2 * (free - shift * l.capacity * 0.5 - l.capacity * pressure - 0.6)), 0.02, 0.98);
    let risk = 0.05; const reasons: string[] = [];
    if (l.covered) reasons.push(rain ? 'Cubierto: sin riesgo por lluvia' : 'Cubierto'); else if (rain) { risk += 0.15; reasons.push('Descubierto'); }
    if (night) reasons.push('Vigilado de noche');
    if (!free) reasons.push('Lleno ahora');
    push({ id: 'parqueadero-' + l.id, kind: 'parqueadero', name: l.name, detail: `Privado · ${free} de ${l.capacity} libres`,
      lat: l.lat, lng: l.lng, probability: Math.round(p * 100), freeNow: free, walkMinutes: walk(l.lat, l.lng, d), risk, reasons });
  });
  return out.sort((a, b) => b.score - a.score);
}

const later = <T,>(v: T, ms = 120) => new Promise<T>((r) => setTimeout(() => r(v), ms));
const destById = (id: number) => dests.find((d) => d.id === id) ?? dests[0];

export const mockApi = {
  zones: () => later(zonesDto()),
  lots: () => later(lotsDto()),
  destinations: () => later(dests.map(strip)),
  recommendations: (destination: number, eta: number, rain?: boolean) => later(recommend(destById(destination), eta, !!rain)),
  scenarios: () => later(SCENARIOS.map(({ hour, zonesFree, lotsUsed, ...s }) => s)),
  applyScenario: (id: string) => {
    const sc = SCENARIOS.find((s) => s.id === id);
    if (!sc) return Promise.reject(new Error('Caso no existe'));
    simHour = sc.hour;
    randomize();
    Object.entries(sc.zonesFree).forEach(([zid, free]) => {
      const list = spots[+zid]; if (!list) return;
      const step = list.length / Math.max(1, free);
      list.forEach((_, i) => { list[i] = { occupied: true, plate: plate(), since: Date.now() - (15 + ((i * 37) % 90)) * MIN }; });
      for (let k = 0; k < free; k++) list[Math.min(list.length - 1, Math.floor(k * step))] = { occupied: false, plate: null, since: 0 };
    });
    lots.forEach((l, i) => { l.used = sc.lotsUsed[l.id] ?? LOTS0[i].used; });
    emit(`Caso de demo: ${sc.title} (${sc.when}).`);
    return later({ ok: true });
  },
  resetScenario: () => { simHour = null; lots.forEach((l, i) => { l.used = LOTS0[i].used; }); randomize(); emit('Datos en vivo de nuevo.'); return later({ ok: true }); },
  reserve: (lotId: number) => {
    const l = lots.find((x) => x.id === lotId);
    if (!l) return Promise.reject(new Error('Parqueadero no existe'));
    if (l.used >= l.capacity) return Promise.reject(new Error('Ya no hay cupo para apartar'));
    l.used++;
    const until = new Date(Date.now() + 15 * MIN).toISOString();
    emit(`Cupo apartado en ${l.name.split(' (')[0]} por 15 min.`);
    return later({ until });
  },
  occupy: (zoneId: number, index: number, p: string) => {
    const s = spots[zoneId]?.[index];
    const z = RZ.find((x) => x.id === zoneId);
    if (!s || !z) return Promise.reject(new Error('Cupo no existe'));
    if (s.occupied) return Promise.reject(new Error(`El cupo ${index + 1} ya está ocupado`));
    const v = p.toUpperCase().replace(/[^A-Z0-9]/g, '') || plate();
    spots[zoneId][index] = { occupied: true, plate: v, since: Date.now() };
    emit(`Auxiliar: cupo ${index + 1} de ${z.name} ocupado (${v}).`);
    return later(zonesDto().find((x) => x.id === zoneId)!.spots[index]);
  },
  release: (zoneId: number, index: number) => {
    const s = spots[zoneId]?.[index];
    const z = RZ.find((x) => x.id === zoneId);
    if (!s?.occupied || !z) return Promise.reject(new Error(`El cupo ${index + 1} ya está libre`));
    const f = fee(mins(s));
    spots[zoneId][index] = { occupied: false, plate: null, since: 0 };
    emit(`Auxiliar: cupo ${index + 1} de ${z.name} liberado. Cobro $${f.toLocaleString('es-CO')}.`);
    return later({ fee: f });
  },
  agent: (text: string, history: Turn[], rain?: boolean): Promise<AgentReply> => {
    const hi = history.length === 0 ? '¡Hola! ' : '';
    const d = findDest(text);
    if (!d) return later({ reply: `${hi}¿A dónde vas? Conozco lugares en Laureles, El Poblado, Envigado e Itagüí.`, mode: 'reglas', suggestion: null, alternative: null, destination: null }, 500);
    const m = /(\d{1,2})\s*min/.exec(text.toLowerCase());
    const eta = m ? +m[1] : 10;
    const raining = !!rain || /llov|lluvia|aguacero/i.test(text);
    const opts = recommend(d, eta, raining);
    const best = opts[0];
    const alt = opts.find((o) => o.kind !== best.kind) ?? null;
    const calm = alt ? 1 - (1 - best.probability / 100) * (1 - alt.probability / 100) : best.probability / 100;
    const where = (o: Option) => (o.kind === 'zona' ? 'en la calle' : 'un parqueadero privado');
    const reply = `${hi}Te marqué en el mapa la mejor opción cerca de ${d.name}, ${where(best)}: ${best.name}, con ${best.probability}% de probabilidad y a ${best.walkMinutes} ${best.walkMinutes === 1 ? 'minuto' : 'minutos'} caminando. `
      + (alt ? `Tu plan B, ${where(alt)}: ${alt.name}, a ${alt.walkMinutes} min. ` : '')
      + (raining ? 'Como está lloviendo, evité las cuadras con árboles grandes. ' : '')
      + (calm >= 0.9 ? 'Tranquilo, entre las dos es casi seguro que parqueas. ' : best.kind === 'parqueadero' ? 'Está apretado: te recomiendo apartar el cupo ya. ' : 'Está apretado, ten a mano el plan B. ')
      + '¿Te llevo?';
    return later({ reply, mode: 'reglas', suggestion: best, alternative: alt, destination: strip(d) }, 700);
  },
};
