package com.yuhai.backend.machine;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record MachineCreateRequest(
        @JsonProperty("资产编号")
        @JsonAlias("assetNumber")
        @NotBlank(message = "资产编号不能为空")
        @Size(max = 64, message = "资产编号长度不能超过64个字符")
        String assetNumber,

        @JsonProperty("资产名称")
        @JsonAlias("assetName")
        @NotBlank(message = "资产名称不能为空")
        @Size(max = 100, message = "资产名称长度不能超过100个字符")
        String assetName,

        @JsonProperty("规格型号")
        @JsonAlias("specifications")
        @Size(max = 120, message = "规格型号长度不能超过120个字符")
        String specifications,

        @JsonProperty("资产分类")
        @JsonAlias("classification")
        @Size(max = 80, message = "资产分类长度不能超过80个字符")
        String classification,

        @JsonProperty("吨位")
        @JsonAlias("tonnage")
        @Positive(message = "吨位必须大于0")
        @Digits(integer = 8, fraction = 2, message = "吨位最多8位整数和2位小数")
        BigDecimal tonnage,

        @JsonProperty("总功率")
        @JsonAlias("totalPower")
        @Positive(message = "总功率必须大于0")
        @Digits(integer = 8, fraction = 2, message = "总功率最多8位整数和2位小数")
        BigDecimal totalPower,

        @JsonProperty("螺杆直径")
        @JsonAlias("screwDiameter")
        @Positive(message = "螺杆直径必须大于0")
        @Digits(integer = 8, fraction = 2, message = "螺杆直径最多8位整数和2位小数")
        BigDecimal screwDiameter
) {
}
