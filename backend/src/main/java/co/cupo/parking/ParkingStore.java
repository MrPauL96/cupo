package co.cupo.parking;

import co.cupo.live.LiveUpdates;
import co.cupo.model.Models.Destination;
import co.cupo.model.Models.ParkingLot;
import co.cupo.model.Models.Scenario;
import co.cupo.model.Models.Spot;
import co.cupo.model.Models.Zone;
import org.springframework.stereotype.Component;

import java.text.Normalizer;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ThreadLocalRandom;

/**
 * Datos del piloto en memoria: Laureles, El Poblado, Envigado e Itagüí.
 * Las referencias de ubicación son reales (Google Maps); cupos, placas y parqueaderos son de ejemplo,
 * con nombres genéricos a propósito. En producción esto va a PostgreSQL + PostGIS.
 */
@Component
public class ParkingStore {
    private static final String LETTERS = "ABCDEFGHJKLMNPRSTUVWXYZ";

    private final LiveUpdates live;

    private final List<Zone> zones = List.of(
            new Zone(0, "laureles", "Cra. 70 entre Cl. 44 y Cq. 1", 6.2484, -75.5889, 6.2460, -75.5892, false, 0.30),
            new Zone(1, "laureles", "Costado norte del Primer Parque", 6.2466, -75.5929, 6.2466, -75.5942, true, 0.15),
            new Zone(2, "laureles", "Av. Nutibara con Cq. 4", 6.2447, -75.5950, 6.2460, -75.5962, true, 0.20),
            new Zone(3, "laureles", "Av. 33 con Cra. 76", 6.2391, -75.5959, 6.2393, -75.5940, false, 0.45),
            new Zone(4, "laureles", "Cra. 76, Segundo Parque", 6.2438, -75.5966, 6.2455, -75.5966, true, 0.20),
            new Zone(5, "laureles", "Cq. 1 frente a la UPB", 6.2439, -75.5899, 6.2430, -75.5905, true, 0.15),
            new Zone(10, "poblado", "Cl. 10 entre Av. El Poblado y Cra. 37", 6.2103, -75.5697, 6.2094, -75.5674, false, 0.35),
            new Zone(11, "poblado", "Cra. 37, Parque Lleras", 6.2099, -75.5667, 6.2083, -75.5668, true, 0.40),
            new Zone(12, "poblado", "Cra. 35, Provenza", 6.2095, -75.5656, 6.2079, -75.5657, true, 0.45),
            new Zone(13, "poblado", "Av. El Poblado junto al parque", 6.2113, -75.5707, 6.2097, -75.5706, false, 0.30),
            new Zone(20, "envigado", "Cl. 38 Sur junto al parque", 6.1699, -75.5880, 6.1699, -75.5866, true, 0.15),
            new Zone(21, "envigado", "Cra. 43A con Cl. 37 Sur", 6.1718, -75.5885, 6.1705, -75.5884, false, 0.20),
            new Zone(22, "envigado", "Cl. 36 Sur", 6.1722, -75.5880, 6.1722, -75.5866, false, 0.15),
            new Zone(30, "itagui", "Junto al Parque Obrero", 6.1716, -75.6126, 6.1716, -75.6109, true, 0.30),
            new Zone(31, "itagui", "Cuadra oriental del parque", 6.1712, -75.6103, 6.1726, -75.6103, false, 0.35),
            new Zone(32, "itagui", "Hacia la Cl. 51", 6.1722, -75.6098, 6.1722, -75.6086, false, 0.30));
    private static final Map<Integer, Integer> SIZES = Map.ofEntries(
            Map.entry(0, 8), Map.entry(1, 8), Map.entry(2, 10), Map.entry(3, 8), Map.entry(4, 6), Map.entry(5, 8),
            Map.entry(10, 10), Map.entry(11, 8), Map.entry(12, 8), Map.entry(13, 8),
            Map.entry(20, 8), Map.entry(21, 8), Map.entry(22, 6),
            Map.entry(30, 8), Map.entry(31, 6), Map.entry(32, 8));

    private final List<ParkingLot> lots = List.of(
            new ParkingLot(0, "laureles", "Parqueadero La 70 (cubierto)", 6.2474, -75.5884, 40, 37, true),
            new ParkingLot(1, "laureles", "Parqueadero Nutibara (descubierto)", 6.2443, -75.5941, 25, 25, false),
            new ParkingLot(2, "laureles", "Parqueadero Av. 33 (cubierto)", 6.2398, -75.5951, 60, 44, true),
            new ParkingLot(3, "laureles", "Parqueadero Cq. 1 (cubierto)", 6.2424, -75.5884, 50, 31, true),
            new ParkingLot(4, "laureles", "Parqueadero Cq. 4 (cubierto)", 6.2462, -75.5919, 30, 26, true),
            new ParkingLot(10, "poblado", "Parqueadero Lleras (cubierto)", 6.2093, -75.5684, 80, 66, true),
            new ParkingLot(11, "poblado", "Parqueadero Provenza (cubierto)", 6.2082, -75.5648, 45, 38, true),
            new ParkingLot(12, "poblado", "Parqueadero Cl. 10 (descubierto)", 6.2100, -75.5690, 30, 22, false),
            new ParkingLot(20, "envigado", "Parqueadero del parque (cubierto)", 6.1712, -75.5862, 40, 30, true),
            new ParkingLot(21, "envigado", "Parqueadero Cl. 39 Sur (descubierto)", 6.1690, -75.5878, 25, 15, false),
            new ParkingLot(30, "itagui", "Parqueadero Parque Obrero (cubierto)", 6.1728, -75.6114, 35, 28, true),
            new ParkingLot(31, "itagui", "Parqueadero Cra. 52 (descubierto)", 6.1704, -75.6099, 30, 20, false));

    private final List<Destination> destinations = List.of(
            new Destination(0, "laureles", "Primer Parque de Laureles", List.of("primer parque", "parque de laureles"), 6.2458, -75.5935),
            new Destination(1, "laureles", "UPB", List.of("upb", "bolivariana", "universidad pontificia"), 6.2421, -75.5895),
            new Destination(2, "laureles", "La 70 con Cl. 44", List.of("la 70", "setenta", "san juan"), 6.2492, -75.5888),
            new Destination(3, "laureles", "Segundo Parque de Laureles", List.of("segundo parque"), 6.2447, -75.5969),
            new Destination(4, "laureles", "Unicentro", List.of("unicentro"), 6.2411, -75.5870),
            new Destination(10, "poblado", "Parque Lleras", List.of("lleras"), 6.2090, -75.5680),
            new Destination(11, "poblado", "Provenza", List.of("provenza"), 6.2087, -75.5656),
            new Destination(12, "poblado", "Parque de El Poblado", List.of("parque del poblado", "parque de el poblado", "poblado"), 6.2103, -75.5710),
            new Destination(20, "envigado", "Parque de Envigado", List.of("envigado"), 6.1700, -75.5874),
            new Destination(21, "envigado", "Cra. 43A con Cl. 37 Sur", List.of("43a", "37 sur"), 6.1711, -75.5883),
            new Destination(30, "itagui", "Parque Obrero de Itagüí", List.of("itagui", "parque obrero"), 6.1720, -75.6117),
            new Destination(31, "itagui", "Cl. 51 con Cra. 50, Itagüí", List.of("calle 51", "cl 51"), 6.1722, -75.6089));

    private final List<Scenario> scenarios = List.of(
            new Scenario("lluvia-laureles", "Aguacero en Laureles", "Jueves 3:00 p. m.", "laureles", 0, 10, true,
                    "Voy para el Primer Parque, llego en 10 minutos y está lloviendo",
                    "Gana el privado cubierto: no te dejo bajo los árboles", 15,
                    Map.of(0, 1, 1, 4, 2, 5, 3, 2, 4, 3, 5, 2), Map.of(0, 38, 1, 25, 2, 40, 3, 35, 4, 24)),
            new Scenario("domingo-envigado", "Domingo en Envigado", "Domingo 10:00 a. m.", "envigado", 20, 10, false,
                    "Voy al parque de Envigado, llego en 10 minutos",
                    "Gana la calle: hay cupo al lado del parque y es más económica", 10,
                    Map.of(20, 5, 21, 4, 22, 4), Map.of(20, 30, 21, 10)),
            new Scenario("viernes-provenza", "Viernes de noche en Provenza", "Viernes 8:00 p. m.", "poblado", 11, 15, false,
                    "Voy para Provenza, llego en 15 minutos",
                    "Gana el privado: la calle está llena y de noche es más seguro", 20,
                    Map.of(10, 0, 11, 1, 12, 0, 13, 1), Map.of(10, 70, 11, 43, 12, 30)),
            new Scenario("pico-itagui", "Hora pico en Itagüí", "Martes 6:00 p. m.", "itagui", 30, 10, false,
                    "Voy al Parque Obrero de Itagüí, llego en 10 minutos",
                    "Todo está apretado: Cupo te propone apartar el cupo ya", 18,
                    Map.of(30, 1, 31, 0, 32, 1), Map.of(30, 33, 31, 29)),
            new Scenario("upb-temprano", "Clase temprano en la UPB", "Lunes 6:40 a. m.", "laureles", 1, 10, false,
                    "Voy para la UPB, llego en 10 minutos",
                    "Gana la calle: a esta hora hay cupo frente a la universidad", 6.67,
                    Map.of(0, 5, 1, 3, 2, 4, 3, 3, 4, 2, 5, 6), Map.of(0, 20, 1, 10, 2, 30, 3, 12, 4, 14)));

    /** Hora simulada por un caso de demo; null = hora real. */
    private volatile Double simHour;

    public ParkingStore(LiveUpdates live) {
        this.live = live;
        randomize();
        // Cupo de ejemplo "olvidado": lleva más de 9 h ocupado
        Spot forgotten = zone(1).spots.get(2);
        forgotten.occupied = true;
        forgotten.plate = "KLM482";
        forgotten.since = Instant.now().minus(Duration.ofMinutes(9 * 60 + 12));
    }

    public List<Zone> zones() { return zones; }
    public List<ParkingLot> lots() { return lots; }
    public List<Destination> destinations() { return destinations; }
    public List<Scenario> scenarios() { return scenarios; }
    public Double simHour() { return simHour; }

    public Zone zone(int id) {
        return zones.stream().filter(z -> z.id == id).findFirst()
                .orElseThrow(() -> new NotFound("Cuadra " + id + " no existe"));
    }

    public ParkingLot lot(int id) {
        return lots.stream().filter(l -> l.id == id).findFirst()
                .orElseThrow(() -> new NotFound("Parqueadero " + id + " no existe"));
    }

    public Destination destination(int id) {
        return destinations.stream().filter(d -> d.id() == id).findFirst().orElse(destinations.get(0));
    }

    /** Busca un destino por nombre o alias, sin importar tildes ni mayúsculas. */
    public Optional<Destination> findDestination(String text) {
        if (text == null || text.isBlank()) return Optional.empty();
        String t = normalize(text);
        for (Destination d : destinations) {
            if (t.contains(normalize(d.name())) || normalize(d.name()).contains(t)) return Optional.of(d);
            for (String a : d.aliases()) if (t.contains(a)) return Optional.of(d);
        }
        return Optional.empty();
    }

    // ---------- Casos de demo ----------

    public synchronized Scenario applyScenario(String id) {
        Scenario sc = scenarios.stream().filter(s -> s.id().equals(id)).findFirst()
                .orElseThrow(() -> new NotFound("Caso " + id + " no existe"));
        simHour = sc.hour();
        randomize();
        sc.zonesFree().forEach((zid, free) -> {
            Zone z = zone(zid);
            int n = z.spots.size();
            for (int i = 0; i < n; i++) {
                Spot s = z.spots.get(i);
                s.occupied = true;
                s.plate = randomPlate();
                s.since = Instant.now().minus(Duration.ofMinutes(15 + (i * 37) % 90));
            }
            double step = (double) n / Math.max(1, free);
            for (int k = 0; k < free; k++) {
                Spot s = z.spots.get(Math.min(n - 1, (int) Math.floor(k * step)));
                s.occupied = false; s.plate = null; s.since = null;
            }
        });
        for (ParkingLot l : lots) l.used = sc.lotsUsed().getOrDefault(l.id, l.initialUsed);
        live.broadcast("Caso de demo: " + sc.title() + " (" + sc.when() + ").");
        return sc;
    }

    public synchronized void resetScenario() {
        simHour = null;
        for (ParkingLot l : lots) l.used = l.initialUsed;
        randomize();
        live.broadcast("Datos en vivo de nuevo.");
    }

    // ---------- Operación ----------

    public synchronized Spot occupy(int zoneId, int index, String plate) {
        Zone z = zone(zoneId);
        Spot s = spot(z, index);
        if (s.occupied) throw new Conflict("El cupo " + (index + 1) + " ya está ocupado");
        String p = plate == null ? "" : plate.toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9]", "");
        s.occupied = true;
        s.plate = p.isEmpty() ? randomPlate() : p;
        s.since = Instant.now();
        live.broadcast("Auxiliar: cupo " + (index + 1) + " de " + z.name + " ocupado (" + s.plate + ").");
        return s;
    }

    /** Libera el cupo y devuelve el valor a cobrar (tarifa de ejemplo: $1.000 por fracción de 30 min). */
    public synchronized long release(int zoneId, int index) {
        Zone z = zone(zoneId);
        Spot s = spot(z, index);
        if (!s.occupied) throw new Conflict("El cupo " + (index + 1) + " ya está libre");
        long fee = fee(s.minutes());
        s.occupied = false;
        s.plate = null;
        s.since = null;
        live.broadcast("Auxiliar: cupo " + (index + 1) + " de " + z.name + " liberado. Cobro $" + fee + ".");
        return fee;
    }

    public synchronized ParkingLot gate(int lotId, boolean entry) {
        ParkingLot l = lot(lotId);
        if (entry && l.used < l.capacity) l.used++;
        else if (!entry && l.used > 0) l.used--;
        else return l;
        live.broadcast("Talanquera " + l.name.split(" \\(")[0] + ": " + (entry ? "entrada" : "salida") + ".");
        return l;
    }

    /** Aparta un cupo en un parqueadero privado por 15 minutos (demo: se descuenta de inmediato). */
    public synchronized Instant reserve(int lotId) {
        ParkingLot l = lot(lotId);
        if (l.used >= l.capacity) throw new Conflict("Ya no hay cupo para apartar");
        l.used++;
        live.broadcast("Cupo apartado en " + l.name.split(" \\(")[0] + " por 15 min.");
        return Instant.now().plus(Duration.ofMinutes(15));
    }

    public static long fee(long minutes) {
        return Math.max(1, (long) Math.ceil(minutes / 30.0)) * 1000;
    }

    private void randomize() {
        ThreadLocalRandom r = ThreadLocalRandom.current();
        for (Zone z : zones) {
            z.spots.clear();
            int n = SIZES.getOrDefault(z.id, 8);
            for (int i = 0; i < n; i++) {
                Spot s = new Spot();
                if (r.nextDouble() < 0.72) {
                    s.occupied = true;
                    s.plate = randomPlate();
                    s.since = Instant.now().minus(Duration.ofMinutes(10 + r.nextInt(100)));
                }
                z.spots.add(s);
            }
        }
    }

    private Spot spot(Zone z, int index) {
        if (index < 0 || index >= z.spots.size()) throw new NotFound("Cupo " + (index + 1) + " no existe");
        return z.spots.get(index);
    }

    private static String randomPlate() {
        ThreadLocalRandom r = ThreadLocalRandom.current();
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 3; i++) sb.append(LETTERS.charAt(r.nextInt(LETTERS.length())));
        return sb.append(100 + r.nextInt(900)).toString();
    }

    static String normalize(String s) {
        return Normalizer.normalize(s, Normalizer.Form.NFD).replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9 ]", " ").replaceAll("\\s+", " ").trim();
    }

    public static class NotFound extends RuntimeException {
        public NotFound(String m) { super(m); }
    }

    public static class Conflict extends RuntimeException {
        public Conflict(String m) { super(m); }
    }
}
