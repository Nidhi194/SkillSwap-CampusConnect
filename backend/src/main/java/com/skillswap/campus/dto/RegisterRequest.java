package com.skillswap.campus.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank @Size(min = 2, max = 100) String name,
        @NotBlank @Email @Size(max = 150) String email,
        @NotBlank @Size(min = 6, max = 72, message = "must be between 6 and 72 characters") String password,
        @NotBlank @Size(max = 100) String department,
        @NotNull @Min(1) @Max(8) Integer year,
        @Size(max = 1000) String bio
) {
}
