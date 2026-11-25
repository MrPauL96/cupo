import { Platform } from 'react-native';

export const C = {
  bg: '#F4F6FA',
  card: '#FFFFFF',
  ink: '#0B1220',
  mute: '#6B7280',
  soft: '#EEF2F7',
  line: '#E5E9F0',
  blue: '#1D4ED8',
  blue2: '#0EA5E9',
  band: '#1D4ED8',
  free: '#10B981',
  occ: '#EF4444',
  warn: '#F59E0B',
};

/** Degradado principal (azul señal de tránsito → cielo). */
export const GRAD = ['#1E3A8A', '#1D4ED8', '#0EA5E9'] as const;
export const GRAD_MIC = ['#2563EB', '#06B6D4'] as const;

export const FONT = Platform.select({ web: '"Plus Jakarta Sans", system-ui, sans-serif', default: undefined });

export const shadow = (y = 8, blur = 24, o = 0.12) =>
  Platform.select({
    web: { boxShadow: `0 ${y}px ${blur}px rgba(15, 23, 42, ${o})` } as object,
    default: { shadowColor: '#0F172A', shadowOpacity: o, shadowRadius: blur / 2, shadowOffset: { width: 0, height: y / 2 }, elevation: Math.round(y / 2) },
  });

export const riskColor = (r: string) => (r === 'alto' ? C.occ : r === 'medio' ? C.warn : C.free);
export const probColor = (p: number) => (p >= 70 ? C.free : p >= 40 ? C.warn : C.occ);

/** Abre la ruta en Waze. */
export const wazeUrl = (lat: number, lng: number) => `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
export const gmapsUrl = (lat: number, lng: number) =>
  `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
