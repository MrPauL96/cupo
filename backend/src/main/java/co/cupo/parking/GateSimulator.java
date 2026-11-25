package co.cupo.parking;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.concurrent.ThreadLocalRandom;

/** Simula carros entrando y saliendo de los parqueaderos privados, como si viniera de la talanquera. */
@Component
@ConditionalOnProperty(name = "cupo.simulator.enabled", havingValue = "true", matchIfMissing = true)
public class GateSimulator {
    private final ParkingStore store;

    public GateSimulator(ParkingStore store) {
        this.store = store;
    }

    @Scheduled(fixedDelay = 5000, initialDelay = 5000)
    public void tick() {
        if (store.simHour() != null) return; // durante un caso de demo no movemos los datos
        ThreadLocalRandom r = ThreadLocalRandom.current();
        store.gate(store.lots().get(r.nextInt(store.lots().size())).id, r.nextBoolean());
    }
}
