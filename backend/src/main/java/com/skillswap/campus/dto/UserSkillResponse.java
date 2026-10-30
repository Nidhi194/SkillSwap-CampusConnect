package com.skillswap.campus.dto;

import com.skillswap.campus.entity.UserSkill;

public record UserSkillResponse(
        Long userId,
        Long skillId,
        String skillName,
        String skillType
) {
    public static UserSkillResponse from(UserSkill userSkill) {
        return new UserSkillResponse(
                userSkill.getUser().getId(),
                userSkill.getSkill().getId(),
                userSkill.getSkill().getSkillName(),
                userSkill.getSkillType().name()
        );
    }
}
