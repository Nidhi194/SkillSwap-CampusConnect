package com.skillswap.campus.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateSkillRequest(@NotBlank @Size(max = 100) String skillName) {
}
