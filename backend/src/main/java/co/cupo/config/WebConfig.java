package co.cupo.config;

import co.cupo.live.LiveUpdates;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class WebConfig implements WebMvcConfigurer, WebSocketConfigurer {
    private final LiveUpdates liveUpdates;

    public WebConfig(LiveUpdates liveUpdates) {
        this.liveUpdates = liveUpdates;
    }

    /** Abierto para desarrollo. Antes de producción, restringir orígenes. */
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**").allowedOrigins("*").allowedMethods("*");
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(liveUpdates, "/ws").setAllowedOrigins("*");
    }
}
