package com.skillswap.campus.dto;

import com.skillswap.campus.entity.User;
import com.skillswap.campus.entity.UserRole;

public record UserResponse(
        Long id,
        String name,
        String email,
        String department,
        Integer year,
        String bio,
        UserRole role
) {
    public static UserResponse from(User user) {
        return new UserResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getDepartment(),
                user.getYear(),
                user.getBio(),
                user.getRole()
        );
    }
}
