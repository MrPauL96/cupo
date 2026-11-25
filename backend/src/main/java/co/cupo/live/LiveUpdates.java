package co.cupo.live;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.time.Instant;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * WebSocket en /ws. Cada cambio (cupo ocupado/liberado, talanquera) se avisa a todas las apps
 * conectadas con un mensaje corto; la app vuelve a pedir los datos que necesita.
 */
@Component
public class LiveUpdates extends TextWebSocketHandler {
    private static final Logger log = LoggerFactory.getLogger(LiveUpdates.class);
    private final Set<WebSocketSession> sessions = ConcurrentHashMap.newKeySet();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        sessions.add(session);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        sessions.remove(session);
    }

    public void broadcast(String message) {
        String json = "{\"type\":\"update\",\"at\":\"" + Instant.now() + "\",\"message\":\""
                + message.replace("\\", "\\\\").replace("\"", "\\\"") + "\"}";
        TextMessage msg = new TextMessage(json);
        for (WebSocketSession s : sessions) {
            try {
                synchronized (s) {
                    if (s.isOpen()) s.sendMessage(msg);
                }
            } catch (IOException e) {
                log.debug("No se pudo enviar a {}: {}", s.getId(), e.getMessage());
                sessions.remove(s);
            }
        }
    }
}
