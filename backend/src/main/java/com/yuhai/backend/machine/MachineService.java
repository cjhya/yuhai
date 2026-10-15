package com.yuhai.backend.machine;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class MachineService {

    private final MachineMapper machineMapper;

    public MachineService(MachineMapper machineMapper) {
        this.machineMapper = machineMapper;
    }

    @Transactional
    public MachineResponse create(MachineCreateRequest request) {
        MachineEntity entity = new MachineEntity();
        entity.setAssetNumber(request.assetNumber().trim());
        entity.setAssetName(request.assetName().trim());
        entity.setSpecifications(trimToNull(request.specifications()));
        entity.setClassification(trimToNull(request.classification()));
        entity.setTonnage(request.tonnage());
        entity.setTotalPower(request.totalPower());
        entity.setScrewDiameter(request.screwDiameter());
        entity.setCreatedAt(System.currentTimeMillis());

        int insertedRows = machineMapper.insert(entity);
        if (insertedRows != 1 || entity.getId() == null) {
            throw new DataAccessResourceFailureException("机器信息写入失败");
        }
        return toResponse(entity);
    }

    @Transactional(readOnly = true)
    public List<MachineResponse> list() {
        return machineMapper.selectList(
                        Wrappers.<MachineEntity>lambdaQuery().orderByAsc(MachineEntity::getId)
                ).stream()
                .map(MachineService::toResponse)
                .toList();
    }

    private static MachineResponse toResponse(MachineEntity entity) {
        return new MachineResponse(
                String.valueOf(entity.getId()),
                entity.getAssetNumber(),
                entity.getAssetName(),
                entity.getSpecifications(),
                entity.getClassification(),
                entity.getTonnage(),
                entity.getTotalPower(),
                entity.getScrewDiameter(),
                entity.getCreatedAt()
        );
    }

    private static String trimToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
