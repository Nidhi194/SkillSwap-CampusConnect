package com.skillswap.campus.entity;

import java.io.Serializable;
import java.util.Objects;

public class UserSkillId implements Serializable {

    private Long userId;
    private Long skillId;

    public UserSkillId() {
    }

    public UserSkillId(Long userId, Long skillId) {
        this.userId = userId;
        this.skillId = skillId;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public Long getSkillId() {
        return skillId;
    }

    public void setSkillId(Long skillId) {
        this.skillId = skillId;
    }

    @Override
    public boolean equals(Object other) {
        if (this == other) return true;
        if (!(other instanceof UserSkillId that)) return false;
        return Objects.equals(userId, that.userId) && Objects.equals(skillId, that.skillId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(userId, skillId);
    }
}
