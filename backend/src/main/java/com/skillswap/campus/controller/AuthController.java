package com.skillswap.campus.controller;

import com.skillswap.campus.dto.LoginRequest;
import com.skillswap.campus.dto.RegisterRequest;
import com.skillswap.campus.dto.AuthResponse;
import com.skillswap.campus.dto.UserResponse;
import com.skillswap.campus.security.AuthTokenService;
import com.skillswap.campus.security.AuthUser;
import com.skillswap.campus.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserService userService;
    private final AuthTokenService tokenService;

    public AuthController(UserService userService, AuthTokenService tokenService) {
        this.userService = userService;
        this.tokenService = tokenService;
    }

    @PostMapping("/register")
    public ResponseEntity<UserResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(UserResponse.from(userService.register(request)));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@RequestHeader(value = "Authorization", required = false) String header) {
        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7).trim();
            var user = tokenService.find(token);
            if (user != null) userService.bumpTokenVersion(user.id());
        }
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        var user = userService.login(request.email(), request.password(), httpRequest.getRemoteAddr());
        String token = tokenService.issue(new AuthUser(user.getId(), user.getRole(), user.getTokenVersion()));
        return new AuthResponse(token, UserResponse.from(user));
    }
}
