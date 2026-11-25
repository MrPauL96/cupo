package co.cupo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;

@SpringBootApplication
@EnableScheduling
public class CupoApplication {
    public static void main(String[] args) {
        SpringApplication.run(CupoApplication.class, args);
    }

    /** Scheduler explícito: con @EnableWebSocket, Spring registra otro y @Scheduled podría no encontrar el correcto. */
    @Bean
    public ThreadPoolTaskScheduler taskScheduler() {
        ThreadPoolTaskScheduler s = new ThreadPoolTaskScheduler();
        s.setPoolSize(2);
        s.setThreadNamePrefix("cupo-");
        return s;
    }
}
