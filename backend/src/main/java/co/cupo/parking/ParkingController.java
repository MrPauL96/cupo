package co.cupo.parking;

import co.cupo.model.Models.Destination;
import co.cupo.model.Models.ParkingLot;
import co.cupo.model.Models.Spot;
import co.cupo.model.Models.Zone;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class ParkingController {
    private final ParkingStore store;
    private final RecommendationService recommendations;
    private final WeatherService weather;

    public ParkingController(ParkingStore store, RecommendationService recommendations, WeatherService weather) {
        this.store = store;
        this.recommendations = recommendations;
        this.weather = weather;
    }

    // ---------- DTOs ----------
    public record SpotDto(int index, boolean occupied, String plate, long minutes, boolean anomaly,
                          long estimatedFee, double lat, double lng) {}
    public record ZoneDto(int id, String area, String name, boolean bigTrees, long free, int total, List<SpotDto> spots) {}
    public record LotDto(int id, String area, String name, double lat, double lng, int capacity, int free, boolean covered) {}
    public record OccupyRequest(String plate) {}

    static ZoneDto toDto(Zone z) {
        List<SpotDto> spots = new ArrayList<>();
        for (int i = 0; i < z.spots.size(); i++) {
            Spot s = z.spots.get(i);
            double[] p = z.spotPosition(i);
            spots.add(new SpotDto(i, s.occupied, s.plate, s.minutes(), s.anomaly(),
                    s.occupied ? ParkingStore.fee(s.minutes()) : 0, p[0], p[1]));
        }
        return new ZoneDto(z.id, z.area, z.name, z.bigTrees, z.free(), z.spots.size(), spots);
    }

    static LotDto toDto(ParkingLot l) {
        return new LotDto(l.id, l.area, l.name, l.lat, l.lng, l.capacity, l.free(), l.covered);
    }

    // ---------- Consultas ----------
    @GetMapping("/zones")
    public List<ZoneDto> zones() {
        synchronized (store) { return store.zones().stream().map(ParkingController::toDto).toList(); }
    }

    @GetMapping("/lots")
    public List<LotDto> lots() {
        synchronized (store) { return store.lots().stream().map(ParkingController::toDto).toList(); }
    }

    @GetMapping("/destinations")
    public List<Destination> destinations() {
        return store.destinations();
    }

    @GetMapping("/weather")
    public Map<String, Object> weather() {
        return Map.of("rainExpected", weather.rainExpected(null));
    }

    @GetMapping("/recommendations")
    public List<RecommendationService.Option> recommend(@RequestParam(defaultValue = "0") int destination,
                                                        @RequestParam(defaultValue = "10") int eta,
                                                        @RequestParam(required = false) Boolean rain) {
        return recommendations.recommend(store.destination(destination), eta, weather.rainExpected(rain));
    }

    // ---------- App del auxiliar ----------
    @PostMapping("/zones/{zoneId}/spots/{index}/occupy")
    public SpotDto occupy(@PathVariable int zoneId, @PathVariable int index,
                          @RequestBody(required = false) OccupyRequest req) {
        store.occupy(zoneId, index, req == null ? null : req.plate());
        synchronized (store) { return toDto(store.zone(zoneId)).spots().get(index); }
    }

    @PostMapping("/zones/{zoneId}/spots/{index}/release")
    public Map<String, Object> release(@PathVariable int zoneId, @PathVariable int index) {
        return Map.of("fee", store.release(zoneId, index));
    }

    // ---------- Talanquera de parqueaderos privados ----------
    @PostMapping("/lots/{lotId}/entry")
    public LotDto entry(@PathVariable int lotId) {
        synchronized (store) { return toDto(store.gate(lotId, true)); }
    }

    @PostMapping("/lots/{lotId}/exit")
    public LotDto exit(@PathVariable int lotId) {
        synchronized (store) { return toDto(store.gate(lotId, false)); }
    }

    /** Aparta un cupo en un parqueadero privado por 15 minutos. */
    @PostMapping("/lots/{lotId}/reserve")
    public Map<String, Object> reserve(@PathVariable int lotId) {
        return Map.of("until", store.reserve(lotId).toString());
    }

    // ---------- Casos de demo ----------
    @GetMapping("/demo/scenarios")
    public List<co.cupo.model.Models.Scenario> scenarios() {
        return store.scenarios();
    }

    @PostMapping("/demo/scenarios/{id}")
    public Map<String, Object> applyScenario(@PathVariable String id) {
        store.applyScenario(id);
        return Map.of("ok", true);
    }

    @PostMapping("/demo/reset")
    public Map<String, Object> resetScenario() {
        store.resetScenario();
        return Map.of("ok", true);
    }

    @ExceptionHandler(ParkingStore.NotFound.class)
    public ResponseEntity<Map<String, String>> notFound(RuntimeException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
    }

    @ExceptionHandler(ParkingStore.Conflict.class)
    public ResponseEntity<Map<String, String>> conflict(RuntimeException e) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", e.getMessage()));
    }
}
