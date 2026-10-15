package com.yuhai.backend.machine;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.CannotCreateTransactionException;

import java.math.BigDecimal;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup;

class MachineControllerTest {

    private MachineService machineService;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        machineService = mock(MachineService.class);
        mockMvc = standaloneSetup(new MachineController(machineService))
                .setControllerAdvice(new MachineApiExceptionHandler())
                .build();
    }

    @Test
    void createsMachineWithExistingChineseFieldNames() throws Exception {
        MachineResponse response = demoResponse();
        when(machineService.create(any(MachineCreateRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/machines")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "资产编号": "M-R3-DEMO-001",
                                  "资产名称": "演示注塑机",
                                  "规格型号": "VP550",
                                  "资产分类": "单色注塑机",
                                  "吨位": 550,
                                  "总功率": 100,
                                  "螺杆直径": 55
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", "/api/machines/9"))
                .andExpect(jsonPath("$['资产编号']").value("M-R3-DEMO-001"));
    }

    @Test
    void rejectsMissingRequiredFields() throws Exception {
        mockMvc.perform(post("/api/machines")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_ARGUMENT"));
    }

    @Test
    void listsMachinesReturnedByService() throws Exception {
        when(machineService.list()).thenReturn(List.of(demoResponse()));

        mockMvc.perform(get("/api/machines"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0]['ID']").value("9"))
                .andExpect(jsonPath("$[0]['资产名称']").value("演示注塑机"));
    }

    @Test
    void returnsServiceUnavailableWhenDatabaseFails() throws Exception {
        when(machineService.list()).thenThrow(new CannotCreateTransactionException("database unavailable"));

        mockMvc.perform(get("/api/machines"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("DATABASE_UNAVAILABLE"));
    }

    private static MachineResponse demoResponse() {
        return new MachineResponse(
                "9",
                "M-R3-DEMO-001",
                "演示注塑机",
                "VP550",
                "单色注塑机",
                new BigDecimal("550"),
                new BigDecimal("100"),
                new BigDecimal("55"),
                1_700_000_000_000L
        );
    }
}
