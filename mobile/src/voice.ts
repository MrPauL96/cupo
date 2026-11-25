import * as Speech from 'expo-speech';

/**
 * Voz → texto con expo-speech-recognition (reconocimiento nativo de Android/iOS).
 * Ese módulo NO viene en Expo Go: necesita un "development build" (npx expo run:android).
 * Si no está disponible, la app sigue funcionando escribiendo (o usando el micrófono del teclado).
 */
type SR = typeof import('expo-speech-recognition');
let sr: SR | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  sr = require('expo-speech-recognition') as SR;
} catch {
  sr = null;
}

export const voiceAvailable = (): boolean => {
  try {
    return !!sr && sr.ExpoSpeechRecognitionModule.isRecognitionAvailable();
  } catch {
    return false;
  }
};

type Handlers = {
  onPartial: (text: string) => void;
  onFinal: (text: string) => void;
  onEnd: () => void;
  onError: (message: string) => void;
};

/** Empieza a escuchar en español de Colombia. Devuelve una función para detener. */
export async function listen(h: Handlers): Promise<() => void> {
  if (!sr) throw new Error('Reconocimiento de voz no disponible en esta app (usa un development build).');
  const mod = sr.ExpoSpeechRecognitionModule;
  const perm = await mod.requestPermissionsAsync();
  if (!perm.granted) throw new Error('Sin permiso de micrófono.');

  let finalText = '';
  const subs = [
    mod.addListener('result', (e) => {
      const t = e.results[0]?.transcript ?? '';
      if (e.isFinal) finalText = t;
      else h.onPartial(t);
    }),
    mod.addListener('error', (e) => h.onError(e.message || e.error)),
    mod.addListener('end', () => {
      subs.forEach((s) => s.remove());
      if (finalText) h.onFinal(finalText);
      h.onEnd();
    }),
  ];
  Speech.stop();
  mod.start({ lang: 'es-CO', interimResults: true, continuous: false, addsPunctuation: true });
  return () => mod.stop();
}

/** Lee la respuesta en voz alta. */
export function say(text: string, onDone?: () => void) {
  Speech.stop();
  Speech.speak(text, { language: 'es-CO', rate: 1.0, onDone, onStopped: onDone });
}

export const stopSpeaking = () => Speech.stop();

/** "sí", "dale", "llévame"... para confirmar sin llamar al agente. */
export const isYes = (t: string) => /^\s*(s[ií]|dale|de una|ll[eé]vame|listo|ok|claro|h[aá]gale)\b/i.test(t);
