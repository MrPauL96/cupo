package co.cupo.agent;

import co.cupo.model.Models.Destination;
import co.cupo.parking.ParkingStore;
import co.cupo.parking.RecommendationService;
import co.cupo.parking.RecommendationService.Option;
import co.cupo.parking.WeatherService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Agente de voz de Cupo. Con ANTHROPIC_API_KEY usa Claude con tool calling (Spring AI);
 * sin clave responde con reglas simples para que la demo funcione igual.
 */
@Service
public class AgentService {
    private static final Logger log = LoggerFactory.getLogger(AgentService.class);
    private static final Pattern MINUTES = Pattern.compile("(\\d{1,2})\\s*(min|minutos|minuto)");
    private static final String SYSTEM = """
            Eres Cupo, un asistente de voz que ayuda a conductores del Valle de Aburrá (Laureles, El Poblado,
            Envigado, Itagüí) a encontrar dónde parquear SIN ESTRÉS. Tu tono transmite calma y seguridad.
            La persona está MANEJANDO: responde en español colombiano, cálido y muy breve, sin listas, sin markdown,
            sin emojis. Siempre usa la herramienta buscarOpciones antes de recomendar; nunca inventes cupos ni lugares.
            Responde con esta estructura, en máximo cuatro frases cortas:
            1. Si es el primer mensaje de la conversación, empieza con "¡Hola!".
            2. "Te marqué en el mapa la mejor opción": UNA opción (la primera), diciendo si es en la calle (pública)
               o un parqueadero privado, con su probabilidad de cupo y cuántos minutos camina; si aplica, por qué
               (lluvia y árboles, de noche e inseguridad, más económica).
            3. "Tu plan B": la opción de "mejorDelOtroTipo", con su tipo y minutos caminando.
            4. Tranquilidad: si "tranquilidad" es 90 % o más, di que entre las dos es casi seguro que parquea;
               si es menor y "sePuedeApartar" es verdadero, recomienda apartar el cupo ya; si no, que tenga a mano el plan B.
            Si no sabes el destino, pregunta a dónde va, en una frase.
            Termina preguntando "¿Te llevo?" cuando hayas recomendado un lugar.
            """;


    private final ChatClient chat;
    private final ParkingStore store;
    private final RecommendationService recommendations;
    private final WeatherService weather;
    private final boolean aiEnabled;

    public AgentService(ChatClient.Builder builder, ParkingStore store, RecommendationService recommendations,
                        WeatherService weather, @Value("${spring.ai.anthropic.api-key:sin-clave}") String apiKey) {
        this.chat = builder.defaultSystem(SYSTEM).build();
        this.store = store;
        this.recommendations = recommendations;
        this.weather = weather;
        this.aiEnabled = apiKey != null && !apiKey.isBlank() && !"sin-clave".equals(apiKey);
        log.info("Agente Cupo en modo {}", aiEnabled ? "IA (Claude)" : "reglas (sin ANTHROPIC_API_KEY)");
    }

    public record Turn(String role, String text) {}
    public record AgentRequest(String text, List<Turn> history, Boolean rain) {}
    public record AgentReply(String reply, String mode, Option suggestion, Option alternative, Destination destination) {}

    public AgentReply ask(AgentRequest req) {
        String text = req.text() == null ? "" : req.text().trim();
        if (text.isEmpty()) return new AgentReply("¿A dónde vas?", "reglas", null, null, null);
        if (aiEnabled) {
            try {
                return askAi(text, req);
            } catch (Exception e) {
                log.warn("Falló la IA, uso reglas: {}", e.getMessage());
            }
        }
        return askRules(text, req.rain(), req.history() == null || req.history().isEmpty());
    }

    private AgentReply askAi(String text, AgentRequest req) {
        CupoTools tools = new CupoTools(store, recommendations, weather, req.rain());
        List<Message> history = new ArrayList<>();
        if (req.history() != null) {
            // Solo los últimos turnos: suficiente para "sí, llévame" o "¿y otra opción?"
            List<Turn> h = req.history();
            for (Turn t : h.subList(Math.max(0, h.size() - 6), h.size())) {
                if (t.text() == null || t.text().isBlank()) continue;
                history.add("assistant".equals(t.role()) ? new AssistantMessage(t.text()) : new UserMessage(t.text()));
            }
        }
        String reply = chat.prompt()
                .messages(history)
                .user(text)
                .tools(tools)
                .call()
                .content();
        return new AgentReply(reply, "ia", tools.best, tools.alternative, tools.destination);
    }

    /** Modo sin IA: entiende destino, minutos y lluvia con reglas simples. */
    AgentReply askRules(String text, Boolean rainOverride, boolean first) {
        String hi = first ? "¡Hola! " : "";
        var dest = store.findDestination(text);
        if (dest.isEmpty()) {
            return new AgentReply(hi + "¿A dónde vas? Conozco lugares en Laureles, El Poblado, Envigado e Itagüí.", "reglas", null, null, null);
        }
        int eta = 10;
        Matcher m = MINUTES.matcher(text.toLowerCase(Locale.ROOT));
        if (m.find()) eta = Integer.parseInt(m.group(1));
        String t = text.toLowerCase(Locale.ROOT);
        Boolean rain = rainOverride;
        if (t.contains("llov") || t.contains("lluvia") || t.contains("aguacero")) rain = true;
        boolean raining = weather.rainExpected(rain);

        List<Option> options = recommendations.recommend(dest.get(), eta, raining);
        Option best = options.get(0);
        Option alt = RecommendationService.alternative(options, best);
        int calm = RecommendationService.calm(best, alt);
        StringBuilder sb = new StringBuilder(hi);
        sb.append("Te marqué en el mapa la mejor opción cerca de ").append(dest.get().name()).append(", ")
                .append(where(best)).append(": ").append(best.name()).append(", con ")
                .append(best.probability()).append("% de probabilidad y a ")
                .append(best.walkMinutes()).append(best.walkMinutes() == 1 ? " minuto" : " minutos").append(" caminando. ");
        if (alt != null) sb.append("Tu plan B, ").append(where(alt)).append(": ").append(alt.name())
                .append(", a ").append(alt.walkMinutes()).append(" min. ");
        if (raining) sb.append("Como está lloviendo, evité las cuadras con árboles grandes. ");
        if (calm >= 90) sb.append("Tranquilo, entre las dos es casi seguro que parqueas. ");
        else if ("parqueadero".equals(best.kind())) sb.append("Está apretado: te recomiendo apartar el cupo ya. ");
        else sb.append("Está apretado, ten a mano el plan B. ");
        sb.append("¿Te llevo?");
        return new AgentReply(sb.toString(), "reglas", best, alt, dest.get());
    }

    private static String where(Option o) {
        return "zona".equals(o.kind()) ? "en la calle" : "un parqueadero privado";
    }
}
