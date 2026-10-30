package com.skillswap.campus.security;

import com.skillswap.campus.entity.UserRole;

public record AuthUser(Long id, UserRole role) {
}
