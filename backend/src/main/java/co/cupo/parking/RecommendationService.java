package co.cupo.parking;

import co.cupo.model.Models.Destination;
import co.cupo.model.Models.ParkingLot;
import co.cupo.model.Models.Zone;
import org.springframework.stereotype.Service;

import java.time.LocalTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Recomienda dónde parquear. HOY ES UNA FÓRMULA SIMPLE (no un modelo entrenado):
 * - probabilidad de cupo = cupos libres + rotación − aumento de demanda − carros que llegan mientras vas en camino
 * - riesgo = inseguridad (más de noche) + árboles grandes si llueve
 * - puntaje = probabilidad − riesgo − minutos caminando (más con lluvia) − precio (privado, salvo lluvia o noche)
 * Aquí es donde entrará el modelo de predicción cuando haya datos históricos reales del piloto.
 */
@Service
public class RecommendationService {
    private static final ZoneId MEDELLIN = ZoneId.of("America/Bogota");
    /** Demanda relativa por hora del día (0..1), de ejemplo. */
    private static final double[] DEMAND = {.2, .15, .1, .1, .1, .15, .35, .6, .8, .85, .85, .9,
            .95, .9, .85, .85, .85, .9, .95, .95, .85, .7, .5, .3};

    private final ParkingStore store;

    public RecommendationService(ParkingStore store) {
        this.store = store;
    }

    public record Option(String id, String kind, String name, String detail, double lat, double lng,
                         int probability, long freeNow, int walkMinutes, String riskLevel,
                         List<String> reasons, double score) {}

    public List<Option> recommend(Destination dest, int etaMinutes, boolean rain) {
        double h = hour();
        double later = demand(h + etaMinutes / 60.0);
        double shift = later - demand(h);
        double pressure = 0.004 * etaMinutes * later; // carros que llegan mientras vas en camino
        boolean night = h >= 19 || h < 6;
        double walkWeight = rain ? 9 : 6;
        List<Option> out = new ArrayList<>();

        synchronized (store) {
            for (Zone z : store.zones()) {
                if (!z.area.equals(dest.area())) continue;
                long free = z.free();
                long occ = z.spots.size() - free;
                double expected = free + occ * 0.05 * etaMinutes / 10.0 - shift * z.spots.size() * 1.2
                        - z.spots.size() * 7.5 * pressure;
                double p = clamp(sigmoid(1.4 * (expected - 0.6)), .03, .97);
                double[] m = z.middle();
                int walk = walkMinutes(m[0], m[1], dest);
                double risk = z.insecurity * (night ? 1.3 : 0.6);
                List<String> why = new ArrayList<>();
                if (night && z.insecurity >= .35) why.add("De noche: reportes de inseguridad");
                if (rain && z.bigTrees) { risk += .5; why.add("Árboles grandes: riesgo de ramas con lluvia"); }
                else if (z.bigTrees) why.add("Sombra de árboles");
                if (!rain && !night) why.add("Más económica");
                out.add(option("zona-" + z.id, "zona", z.name, "Pública · zona regulada en la calle · " + free + " libres",
                        m[0], m[1], p, free, walk, risk, why, walkWeight, 0));
            }
            for (ParkingLot l : store.lots()) {
                if (!l.area.equals(dest.area())) continue;
                int free = l.free();
                double expected = free - shift * l.capacity * .5 - l.capacity * pressure;
                double p = clamp(sigmoid(1.2 * (expected - 0.6)), .02, .98);
                int walk = walkMinutes(l.lat, l.lng, dest);
                double risk = .05;
                List<String> why = new ArrayList<>();
                if (l.covered) why.add(rain ? "Cubierto: sin riesgo por lluvia" : "Cubierto");
                else if (rain) { risk += .15; why.add("Descubierto"); }
                if (night) why.add("Vigilado de noche");
                if (free == 0) why.add("Lleno ahora");
                // Privado cuesta más: solo compensa con lluvia, de noche o si la calle no da
                double pricePenalty = !rain && !night ? 18 : 0;
                out.add(option("parqueadero-" + l.id, "parqueadero", l.name,
                        "Privado · " + free + " de " + l.capacity + " libres", l.lat, l.lng, p, free, walk, risk, why,
                        walkWeight, pricePenalty));
            }
        }
        out.sort(Comparator.comparingDouble(Option::score).reversed());
        return out;
    }

    /** La mejor opción del otro tipo (calle ↔ privado): el plan B. */
    public static Option alternative(List<Option> options, Option best) {
        if (best == null) return null;
        return options.stream().filter(o -> !o.kind().equals(best.kind())).findFirst().orElse(null);
    }

    /** Tranquilidad: probabilidad de parquear entre la opción principal y el plan B (0..100). */
    public static int calm(Option best, Option alt) {
        if (best == null) return 0;
        double pb = best.probability() / 100.0, pa = alt == null ? 0 : alt.probability() / 100.0;
        return (int) Math.round(100 * (1 - (1 - pb) * (1 - pa)));
    }

    private double hour() {
        Double sim = store.simHour();
        if (sim != null) return sim;
        LocalTime now = LocalTime.now(MEDELLIN);
        return now.getHour() + now.getMinute() / 60.0;
    }

    private static Option option(String id, String kind, String name, String detail, double lat, double lng,
                                 double p, long free, int walk, double risk, List<String> why,
                                 double walkWeight, double pricePenalty) {
        String level = risk >= .5 ? "alto" : risk >= .25 ? "medio" : "bajo";
        double score = p * 100 - risk * 70 - walk * walkWeight - pricePenalty;
        return new Option(id, kind, name, detail, lat, lng, (int) Math.round(p * 100), free, walk, level, why, score);
    }

    /** Caminando a ~80 m/min. */
    static int walkMinutes(double lat, double lng, Destination d) {
        return Math.max(1, (int) Math.round(haversineMeters(lat, lng, d.lat(), d.lng()) / 80));
    }

    static double haversineMeters(double lat1, double lng1, double lat2, double lng2) {
        double r = 6_371_000, dLat = Math.toRadians(lat2 - lat1), dLng = Math.toRadians(lng2 - lng1);
        double a = Math.pow(Math.sin(dLat / 2), 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) * Math.pow(Math.sin(dLng / 2), 2);
        return 2 * r * Math.asin(Math.sqrt(a));
    }

    private static double demand(double h) {
        h = ((h % 24) + 24) % 24;
        int a = (int) h, b = (a + 1) % 24;
        return DEMAND[a] + (DEMAND[b] - DEMAND[a]) * (h - a);
    }

    private static double sigmoid(double x) { return 1 / (1 + Math.exp(-x)); }

    private static double clamp(double v, double lo, double hi) { return Math.max(lo, Math.min(hi, v)); }
}
