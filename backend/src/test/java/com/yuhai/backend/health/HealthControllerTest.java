package com.yuhai.backend.health;

import org.junit.jupiter.api.Test;
import org.mybatis.spring.MyBatisSystemException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.sql.SQLException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class HealthControllerTest {

    private final DatabaseProbeMapper mapper = mock(DatabaseProbeMapper.class);
    private final HealthController controller = new HealthController(mapper);

    @Test
    void returnsOkOnlyWhenMapperSelectOneReturnsOne() {
        when(mapper.selectOne()).thenReturn(1);

        ResponseEntity<HealthResponse> response = controller.health();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(new HealthResponse("UP", "mysql", "SELECT 1"));
    }

    @Test
    void returnsServiceUnavailableWhenMyBatisCannotGetDatabaseConnection() {
        SQLException authenticationFailure = new SQLException("access denied");
        when(mapper.selectOne()).thenThrow(new MyBatisSystemException("connection failed", authenticationFailure));

        ResponseEntity<HealthResponse> response = controller.health();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
        assertThat(response.getBody()).isEqualTo(new HealthResponse("DOWN", "mysql", "SELECT 1"));
    }
}
