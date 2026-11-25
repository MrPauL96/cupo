import { useEffect, useRef, useState } from 'react';
import { MOCK, WS_URL } from './api';

export type LiveEvent = { at: string; message: string };

/**
 * Escucha los cambios en tiempo real (WebSocket /ws del backend) y llama onUpdate en cada uno.
 * Se reconecta solo si se cae la conexión.
 */
export function useLive(onUpdate: (e: LiveEvent) => void) {
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const cb = useRef(onUpdate);
  cb.current = onUpdate;

  useEffect(() => {
    if (MOCK) {
      setConnected(true);
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return (require('./mock') as typeof import('./mock')).subscribe((e) => {
        setEvents((prev) => [e, ...prev].slice(0, 6));
        cb.current(e);
      });
    }
    let ws: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let closed = false;

    const connect = () => {
      ws = new WebSocket(WS_URL);
      ws.onopen = () => setConnected(true);
      ws.onmessage = (msg) => {
        try {
          const e = JSON.parse(String(msg.data)) as LiveEvent;
          setEvents((prev) => [e, ...prev].slice(0, 6));
          cb.current(e);
        } catch {
          /* mensaje no válido, se ignora */
        }
      };
      ws.onclose = () => {
        setConnected(false);
        if (!closed) retry = setTimeout(connect, 3000);
      };
      ws.onerror = () => ws?.close();
    };
    connect();
    return () => {
      closed = true;
      if (retry) clearTimeout(retry);
      ws?.close();
    };
  }, []);

  return { connected, events };
}
