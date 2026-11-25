import * as Speech from 'expo-speech';

/**
 * Versión web de voice.ts (Metro la elige al compilar para web).
 * Dentro de una página publicada en Claude usa el dictado de Claude (claude.use("dictation"));
 * en un navegador normal usa la Web Speech API si existe.
 */
type Handlers = {
  onPartial: (text: string) => void;
  onFinal: (text: string) => void;
  onEnd: () => void;
  onError: (message: string) => void;
};
type Dictation = {
  start: () => Promise<unknown>;
  stop: () => Promise<unknown>;
  onPartial: (cb: (e: { text: string }) => void) => unknown;
  onFinal: (cb: (e: { text: string }) => void) => unknown;
  onState: (cb: (e: { state: string; reason?: string }) => void) => unknown;
};

const w = (typeof window !== 'undefined' ? window : {}) as {
  claude?: { use: (n: string) => Promise<unknown> };
  SpeechRecognition?: new () => any;
  webkitSpeechRecognition?: new () => any;
};

let dict: Dictation | null = null;
let current: Handlers | null = null;
let finalText = '';

const finish = () => {
  const h = current;
  current = null;
  if (!h) return;
  const t = finalText.trim();
  if (t) h.onFinal(t);
  h.onEnd();
};

if (w.claude?.use) {
  w.claude.use('dictation').then((d) => {
    dict = d as Dictation | null;
    if (!dict) return;
    dict.onPartial(({ text }) => current?.onPartial((finalText + ' ' + text).trim()));
    dict.onFinal(({ text }) => { finalText = (finalText + ' ' + text).trim(); current?.onPartial(finalText); });
    dict.onState(({ state }) => { if (state === 'idle') finish(); });
  }).catch(() => { dict = null; });
}

const WebSR = w.SpeechRecognition ?? w.webkitSpeechRecognition;

export const voiceAvailable = (): boolean => !!dict || !!WebSR;

/** Debe llamarse directo desde el toque del botón: start() va antes de cualquier await. */
export async function listen(h: Handlers): Promise<() => void> {
  current = h;
  finalText = '';
  Speech.stop();

  if (dict) {
    const d = dict;
    d.start().catch((e: unknown) => {
      const reason = String((e as { message?: string })?.message ?? e);
      current = null;
      h.onError(reason.includes('not_granted') ? 'sin permiso de micrófono' : reason);
      h.onEnd();
    });
    return () => { d.stop().catch(() => {}); };
  }

  if (WebSR) {
    const r = new WebSR();
    r.lang = 'es-CO';
    r.interimResults = true;
    r.onresult = (e: any) => {
      let t = '';
      for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
      if (e.results[e.results.length - 1].isFinal) finalText = t;
      h.onPartial(t);
    };
    r.onerror = (e: any) => { current = null; h.onError(e.error ?? 'error'); h.onEnd(); };
    r.onend = finish;
    r.start();
    return () => r.stop();
  }

  current = null;
  throw new Error('El dictado no está disponible aquí. Ábrela en Chrome en el computador, o escribe abajo.');
}

export function say(text: string, onDone?: () => void) {
  Speech.stop();
  Speech.speak(text, { language: 'es-CO', onDone, onStopped: onDone });
}

export const stopSpeaking = () => Speech.stop();

export const isYes = (t: string) => /^\s*(s[ií]|dale|de una|ll[eé]vame|listo|ok|claro|h[aá]gale)\b/i.test(t);
