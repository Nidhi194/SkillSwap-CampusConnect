package com.skillswap.campus.controller;

import com.skillswap.campus.dto.UserResponse;
import com.skillswap.campus.dto.UserUpdateRequest;
import com.skillswap.campus.entity.UserRole;
import com.skillswap.campus.security.AuthUser;
import com.skillswap.campus.security.SecurityAccess;
import com.skillswap.campus.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.access.prepost.PreAuthorize;

import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    private final SecurityAccess securityAccess;

    public UserController(UserService userService, SecurityAccess securityAccess) {
        this.userService = userService;
        this.securityAccess = securityAccess;
    }

    @GetMapping
    public ResponseEntity<List<UserResponse>> getUsers(@RequestParam(required = false) String skill,
                                                       @RequestParam(required = false) UserRole role,
                                                       @RequestParam(required = false) Integer page,
                                                       @RequestParam(defaultValue = "12") int size) {
        if (page != null && page < 0) throw new IllegalArgumentException("Page must be zero or greater.");
        if (size < 1 || size > 100) throw new IllegalArgumentException("Page size must be between 1 and 100.");
        var users = skill != null && !skill.isBlank() ? userService.searchStudentsBySkill(skill)
                : role != null ? userService.getUsersByRole(role) : userService.getAllUsers();
        AuthUser currentUser = securityAccess.currentUser();
        int total = users.size();
        var pagedUsers = page == null ? users : users.stream()
                .skip((long) page * size)
                .limit(size)
                .toList();
        var response = pagedUsers.stream()
                .map(user -> UserResponse.from(user, canViewEmail(currentUser, user.getId())))
                .toList();
        return ResponseEntity.ok()
                .header("X-Total-Count", String.valueOf(total))
                .body(response);
    }

    @GetMapping("/{id}")
    public UserResponse getUser(@PathVariable Long id) {
        var user = userService.getUser(id);
        return UserResponse.from(user, canViewEmail(securityAccess.currentUser(), user.getId()));
    }

    private boolean canViewEmail(AuthUser currentUser, Long targetUserId) {
        return currentUser != null
                && (currentUser.role() == UserRole.ADMIN || currentUser.id().equals(targetUserId));
    }

    @PutMapping("/{id}")
    @PreAuthorize("@securityAccess.canEditUser(#id)")
    public UserResponse updateUser(
            @PathVariable Long id,
            @Valid @RequestBody UserUpdateRequest request
    ) {
        return UserResponse.from(userService.updateUser(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@securityAccess.isAdmin()")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        AuthUser current = securityAccess.currentUser();
        userService.deleteUser(id, current == null ? null : current.id());
        return ResponseEntity.noContent().build();
    }
}
