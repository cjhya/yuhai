package com.yuhai.backend.health;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/health")
public class HealthController {

    private static final Logger log = LoggerFactory.getLogger(HealthController.class);
    private static final HealthResponse UP = new HealthResponse("UP", "mysql", "SELECT 1");
    private static final HealthResponse DOWN = new HealthResponse("DOWN", "mysql", "SELECT 1");

    private final DatabaseProbeMapper databaseProbeMapper;

    public HealthController(DatabaseProbeMapper databaseProbeMapper) {
        this.databaseProbeMapper = databaseProbeMapper;
    }

    @GetMapping
    public ResponseEntity<HealthResponse> health() {
        try {
            Integer result = databaseProbeMapper.selectOne();
            if (Integer.valueOf(1).equals(result)) {
                return ResponseEntity.ok(UP);
            }
            log.warn("MySQL health query returned an unexpected value");
        } catch (RuntimeException exception) {
            log.warn("MySQL health query failed", exception);
        }
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(DOWN);
    }
}
