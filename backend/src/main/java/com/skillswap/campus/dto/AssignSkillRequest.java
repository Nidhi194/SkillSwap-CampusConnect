package com.skillswap.campus.dto;

import com.skillswap.campus.entity.SkillType;
import jakarta.validation.constraints.NotNull;

public record AssignSkillRequest(
        @NotNull Long skillId,
        @NotNull SkillType skillType
) {
}
