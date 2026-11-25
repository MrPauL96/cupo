// Cliente del backend Spring Boot.
// En tu celular "localhost" NO es tu computador: usa la IP de tu PC en la red WiFi, ej. http://192.168.1.50:8080
// Configúrala en el archivo .env:  EXPO_PUBLIC_API_URL=http://192.168.1.50:8080
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.1.50:8080').replace(/\/$/, '');
export const WS_URL = API_URL.replace(/^http/, 'ws') + '/ws';

export type Spot = {
  index: number;
  occupied: boolean;
  plate: string | null;
  minutes: number;
  anomaly: boolean;
  estimatedFee: number;
  lat: number;
  lng: number;
};
export type Zone = { id: number; area: string; name: string; bigTrees: boolean; free: number; total: number; spots: Spot[] };
export type Lot = { id: number; area: string; name: string; lat: number; lng: number; capacity: number; free: number; covered: boolean };
export type Destination = { id: number; area: string; name: string; lat: number; lng: number };
export type Scenario = { id: string; title: string; when: string; area: string; destination: number; eta: number; rain: boolean; say: string; lesson: string };
export type Option = {
  id: string;
  kind: 'zona' | 'parqueadero';
  name: string;
  detail: string;
  lat: number;
  lng: number;
  probability: number;
  freeNow: number;
  walkMinutes: number;
  riskLevel: 'bajo' | 'medio' | 'alto';
  reasons: string[];
};
export type Turn = { role: 'user' | 'assistant'; text: string };
export type AgentReply = { reply: string; mode: 'ia' | 'reglas'; suggestion: Option | null; alternative: Option | null; destination: Destination | null };

export const kindLabel = (k: Option['kind']) => (k === 'zona' ? 'Pública · en la calle' : 'Parqueadero privado');

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(API_URL + path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error ?? `Error ${res.status}`);
  return body as T;
}

const realApi = {
  zones: () => http<Zone[]>('/api/zones'),
  lots: () => http<Lot[]>('/api/lots'),
  destinations: () => http<Destination[]>('/api/destinations'),
  recommendations: (destination: number, eta: number, rain?: boolean) =>
    http<Option[]>(`/api/recommendations?destination=${destination}&eta=${eta}&rain=${rain ? 'true' : 'false'}`),
  occupy: (zoneId: number, index: number, plate: string) =>
    http<Spot>(`/api/zones/${zoneId}/spots/${index}/occupy`, { method: 'POST', body: JSON.stringify({ plate }) }),
  release: (zoneId: number, index: number) =>
    http<{ fee: number }>(`/api/zones/${zoneId}/spots/${index}/release`, { method: 'POST' }),
  scenarios: () => http<Scenario[]>('/api/demo/scenarios'),
  applyScenario: (id: string) => http<{ ok: boolean }>(`/api/demo/scenarios/${id}`, { method: 'POST' }),
  resetScenario: () => http<{ ok: boolean }>('/api/demo/reset', { method: 'POST' }),
  reserve: (lotId: number) => http<{ until: string }>(`/api/lots/${lotId}/reserve`, { method: 'POST' }),
  agent: (text: string, history: Turn[], rain?: boolean) =>
    http<AgentReply>('/api/agent', { method: 'POST', body: JSON.stringify({ text, history, rain: !!rain }) }),
};

// EXPO_PUBLIC_API_URL=mock → backend simulado dentro de la app (vista previa web, sin Spring Boot)
export const MOCK = API_URL === 'mock';
// eslint-disable-next-line @typescript-eslint/no-require-imports
export const api: typeof realApi = MOCK ? require('./mock').mockApi : realApi;

/** Tranquilidad: probabilidad de parquear entre la opción principal y el plan B. */
export const calm = (a?: Option | null, b?: Option | null) =>
  !a ? 0 : Math.round(100 * (1 - (1 - a.probability / 100) * (1 - (b?.probability ?? 0) / 100)));

export const money = (v: number) => '$' + v.toLocaleString('es-CO');
