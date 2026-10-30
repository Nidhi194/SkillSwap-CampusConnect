package com.skillswap.campus.dto;

import jakarta.validation.constraints.NotNull;

public record CreateRequest(
        @NotNull Long senderId,
        @NotNull Long receiverId,
        Long skillId,
        Long offeredSkillId
) {
}
