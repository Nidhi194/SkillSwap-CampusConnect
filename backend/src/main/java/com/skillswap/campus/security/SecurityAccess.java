package com.skillswap.campus.security;

import com.skillswap.campus.entity.UserRole;
import com.skillswap.campus.dao.SwapRequestDAO;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component("securityAccess")
public class SecurityAccess {
    private final SwapRequestDAO swapRequestDAO;

    public SecurityAccess(SwapRequestDAO swapRequestDAO) {
        this.swapRequestDAO = swapRequestDAO;
    }
    public boolean canEditUser(Long userId) {
        AuthUser user = currentUser();
        return user != null && (user.role() == UserRole.ADMIN || user.id().equals(userId));
    }

    public boolean isAdmin() {
        AuthUser user = currentUser();
        return user != null && user.role() == UserRole.ADMIN;
    }

    public boolean canUpdateRequest(Long requestId) {
        AuthUser user = currentUser();
        return user != null && (user.role() == UserRole.ADMIN
                || swapRequestDAO.findById(requestId).map(request -> user.id().equals(request.getReceiverId())).orElse(false));
    }

    public boolean canCancelRequest(Long requestId) {
        AuthUser user = currentUser();
        return user != null && (user.role() == UserRole.ADMIN
                || swapRequestDAO.findById(requestId).map(request -> user.id().equals(request.getSenderId())).orElse(false));
    }

    public boolean canDisconnectRequest(Long requestId) {
        AuthUser user = currentUser();
        return user != null && (user.role() == UserRole.ADMIN
                || swapRequestDAO.findById(requestId)
                        .map(request -> user.id().equals(request.getSenderId()) || user.id().equals(request.getReceiverId()))
                        .orElse(false));
    }

    public void requireUser(Long userId) {
        AuthUser user = currentUser();
        if (user == null || (!user.id().equals(userId) && user.role() != UserRole.ADMIN)) {
            throw new AccessDeniedException("You are not allowed to perform this action.");
        }
    }

    public AuthUser currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication == null || !(authentication.getPrincipal() instanceof AuthUser user) ? null : user;
    }
}
