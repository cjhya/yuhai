package com.yuhai.backend.machine;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class MachineServiceTest {

    private final MachineMapper machineMapper = mock(MachineMapper.class);
    private final MachineService machineService = new MachineService(machineMapper);

    @Test
    void createWritesMachineThroughMapper() {
        when(machineMapper.insert(any(MachineEntity.class))).thenAnswer(invocation -> {
            MachineEntity entity = invocation.getArgument(0);
            entity.setId(7L);
            return 1;
        });

        MachineResponse response = machineService.create(new MachineCreateRequest(
                " M-R3-001 ",
                " 演示注塑机 ",
                "VP550",
                "单色注塑机",
                new BigDecimal("550"),
                new BigDecimal("100"),
                new BigDecimal("55")
        ));

        assertThat(response.id()).isEqualTo("7");
        assertThat(response.assetNumber()).isEqualTo("M-R3-001");
        assertThat(response.assetName()).isEqualTo("演示注塑机");
        assertThat(response.createdAt()).isPositive();
        verify(machineMapper).insert(any(MachineEntity.class));
    }

    @Test
    void listReadsMachinesThroughMapper() {
        MachineEntity entity = new MachineEntity();
        entity.setId(8L);
        entity.setAssetNumber("M-R3-002");
        entity.setAssetName("演示注塑机");
        entity.setCreatedAt(1_700_000_000_000L);
        when(machineMapper.selectList(any())).thenReturn(List.of(entity));

        List<MachineResponse> result = machineService.list();

        assertThat(result).extracting(MachineResponse::assetNumber)
                .containsExactly("M-R3-002");
        verify(machineMapper).selectList(any());
    }
}
