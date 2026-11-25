package co.cupo.agent;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/agent")
public class AgentController {
    private final AgentService agent;

    public AgentController(AgentService agent) {
        this.agent = agent;
    }

    /**
     * La app convierte la voz en texto y lo manda aquí. Ej.:
     * {"text": "voy para el Primer Parque, llego en diez minutos", "history": [], "rain": null}
     */
    @PostMapping
    public AgentService.AgentReply ask(@RequestBody AgentService.AgentRequest req) {
        return agent.ask(req);
    }
}
