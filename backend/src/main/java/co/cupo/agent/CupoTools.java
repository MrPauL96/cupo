package co.cupo.agent;

import co.cupo.model.Models.Destination;
import co.cupo.parking.ParkingStore;
import co.cupo.parking.RecommendationService;
import co.cupo.parking.RecommendationService.Option;
import co.cupo.parking.WeatherService;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Herramientas que el agente puede llamar. Se crea una instancia por pregunta, así guarda
 * la mejor opción encontrada para devolverla a la app (y marcarla en el mapa).
 */
public class CupoTools {
    private final ParkingStore store;
    private final RecommendationService recommendations;
    private final WeatherService weather;
    private final Boolean rainOverride;

    Option best;
    Option alternative;
    Destination destination;

    public CupoTools(ParkingStore store, RecommendationService recommendations, WeatherService weather, Boolean rainOverride) {
        this.store = store;
        this.recommendations = recommendations;
        this.weather = weather;
        this.rainOverride = rainOverride;
    }

    @Tool(description = "Lista los destinos que conoce el piloto (Laureles, El Poblado, Envigado e Itagüí).")
    public List<String> listarDestinos() {
        return store.destinations().stream().map(Destination::name).toList();
    }

    @Tool(description = "Busca dónde parquear cerca de un destino del piloto (Laureles, El Poblado, Envigado, Itagüí). Devuelve las mejores "
            + "opciones ordenadas (zonas azules en la calle y parqueaderos privados) con probabilidad de "
            + "encontrar cupo al llegar, minutos caminando, nivel de riesgo y motivos, y si se espera lluvia.")
    public Map<String, Object> buscarOpciones(
            @ToolParam(description = "Destino del conductor, como lo dijo (ej. 'Primer Parque', 'la UPB', 'la 70')") String destino,
            @ToolParam(description = "Minutos que le faltan para llegar; usa 10 si no lo dijo") int minutosParaLlegar,
            @ToolParam(description = "true si el conductor dice que está lloviendo o va a llover; si no, false") boolean lluvia) {
        Map<String, Object> out = new LinkedHashMap<>();
        var d = store.findDestination(destino);
        if (d.isEmpty()) {
            out.put("error", "Destino no reconocido");
            out.put("destinosConocidos", listarDestinos());
            return out;
        }
        boolean rain = lluvia || weather.rainExpected(rainOverride);
        List<Option> options = recommendations.recommend(d.get(), Math.max(0, minutosParaLlegar), rain);
        destination = d.get();
        best = options.get(0);
        alternative = RecommendationService.alternative(options, best);
        out.put("destino", d.get().name());
        out.put("lluviaEsperada", rain);
        out.put("mejorOpcion", best.name() + " (" + tipo(best) + ")");
        if (alternative != null) out.put("mejorDelOtroTipo", alternative.name() + " (" + tipo(alternative) + ")");
        out.put("tranquilidad", RecommendationService.calm(best, alternative) + "% de que parquea entre la mejor opción y el plan B");
        out.put("sePuedeApartar", "parqueadero".equals(best.kind()));
        out.put("opciones", options.stream().limit(4).map(o -> Map.of(
                "id", o.id(),
                "tipo", tipo(o),
                "nombre", o.name(),
                "detalle", o.detail(),
                "probabilidadCupo", o.probability() + "%",
                "minutosCaminando", o.walkMinutes(),
                "riesgo", o.riskLevel(),
                "motivos", o.reasons())).toList());
        return out;
    }

    private static String tipo(Option o) {
        return "zona".equals(o.kind()) ? "pública, en la calle" : "parqueadero privado";
    }
}
