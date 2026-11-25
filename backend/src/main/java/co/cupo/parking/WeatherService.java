package co.cupo.parking;

import com.fasterxml.jackson.databind.JsonNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.time.Instant;

/**
 * ¿Va a llover en Laureles en la próxima hora? Usa Open-Meteo (gratis, sin clave) y guarda el
 * resultado 10 minutos. Si falla la consulta, asume que no llueve.
 */
@Service
public class WeatherService {
    private static final Logger log = LoggerFactory.getLogger(WeatherService.class);
    private static final String URL = "https://api.open-meteo.com/v1/forecast?latitude=6.2442&longitude=-75.5900"
            + "&hourly=precipitation_probability,precipitation&forecast_hours=2&timezone=America%2FBogota";

    private final RestClient http = RestClient.create();
    private final boolean enabled;
    private Boolean cached;
    private Instant cachedAt = Instant.EPOCH;

    public WeatherService(@Value("${cupo.weather.enabled:true}") boolean enabled) {
        this.enabled = enabled;
    }

    /** @param override si la app manda un valor (interruptor de demo), se usa ese. */
    public synchronized boolean rainExpected(Boolean override) {
        if (override != null) return override;
        if (!enabled) return false;
        if (cached != null && Duration.between(cachedAt, Instant.now()).toMinutes() < 10) return cached;
        try {
            JsonNode body = http.get().uri(URL).retrieve().body(JsonNode.class);
            boolean rain = false;
            JsonNode prob = body.path("hourly").path("precipitation_probability");
            JsonNode mm = body.path("hourly").path("precipitation");
            for (int i = 0; i < prob.size(); i++) {
                if (prob.get(i).asInt() >= 60 || mm.path(i).asDouble() >= 2.0) rain = true;
            }
            cached = rain;
        } catch (Exception e) {
            log.warn("No se pudo consultar el clima: {}", e.getMessage());
            cached = false;
        }
        cachedAt = Instant.now();
        return cached;
    }
}
