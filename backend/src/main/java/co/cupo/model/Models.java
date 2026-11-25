package co.cupo.model;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/** Modelo de dominio en memoria. En producción esto va a PostgreSQL + PostGIS. */
public final class Models {
    private Models() {}

    /** Un cupo de zona de estacionamiento regulado ("zona azul") en la calle. */
    public static class Spot {
        public boolean occupied;
        public String plate;
        public Instant since;

        public long minutes() {
            return occupied && since != null ? Duration.between(since, Instant.now()).toMinutes() : 0;
        }

        /** Ocupado más de 4 h: probablemente el auxiliar olvidó liberarlo. */
        public boolean anomaly() {
            return occupied && minutes() > 240;
        }
    }

    /** Una cuadra con cupos en línea, entre dos puntos. */
    public static class Zone {
        public final int id;
        public final String area;
        public final String name;
        public final double lat1, lng1, lat2, lng2;
        public final boolean bigTrees;
        /** 0..1, a partir de reportes de seguridad (simulado). */
        public final double insecurity;
        public final List<Spot> spots = new ArrayList<>();

        public Zone(int id, String area, String name, double lat1, double lng1, double lat2, double lng2,
                    boolean bigTrees, double insecurity) {
            this.id = id; this.area = area; this.name = name;
            this.lat1 = lat1; this.lng1 = lng1; this.lat2 = lat2; this.lng2 = lng2;
            this.bigTrees = bigTrees; this.insecurity = insecurity;
        }

        public double[] spotPosition(int i) {
            double t = (i + 0.5) / spots.size();
            return new double[]{lat1 + (lat2 - lat1) * t, lng1 + (lng2 - lng1) * t};
        }

        public double[] middle() {
            return new double[]{(lat1 + lat2) / 2, (lng1 + lng2) / 2};
        }

        public long free() {
            return spots.stream().filter(s -> !s.occupied).count();
        }
    }

    /** Parqueadero privado conectado por su talanquera (entrada/salida). */
    public static class ParkingLot {
        public final int id;
        public final String area;
        public final String name;
        public final double lat, lng;
        public final int capacity;
        public final int initialUsed;
        public final boolean covered;
        public int used;

        public ParkingLot(int id, String area, String name, double lat, double lng, int capacity, int used, boolean covered) {
            this.id = id; this.area = area; this.name = name; this.lat = lat; this.lng = lng;
            this.capacity = capacity; this.used = used; this.initialUsed = used; this.covered = covered;
        }

        public int free() {
            return capacity - used;
        }
    }

    public record Destination(int id, String area, String name, List<String> aliases, double lat, double lng) {}

    /** Caso de demo: fija hora simulada, lluvia y ocupación para contar una historia concreta. */
    public record Scenario(String id, String title, String when, String area, int destination, int eta, boolean rain,
                           String say, String lesson, double hour, java.util.Map<Integer, Integer> zonesFree,
                           java.util.Map<Integer, Integer> lotsUsed) {}
}
