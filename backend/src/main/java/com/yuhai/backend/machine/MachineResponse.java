package com.yuhai.backend.machine;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;

public record MachineResponse(
        @JsonProperty("ID") String id,
        @JsonProperty("资产编号") String assetNumber,
        @JsonProperty("资产名称") String assetName,
        @JsonProperty("规格型号") String specifications,
        @JsonProperty("资产分类") String classification,
        @JsonProperty("吨位") BigDecimal tonnage,
        @JsonProperty("总功率") BigDecimal totalPower,
        @JsonProperty("螺杆直径") BigDecimal screwDiameter,
        @JsonProperty("创建时间") Long createdAt
) {
}
