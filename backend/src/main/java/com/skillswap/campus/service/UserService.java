package com.skillswap.campus.service;

import com.skillswap.campus.dao.SkillDAO;
import com.skillswap.campus.dao.UserDAO;
import com.skillswap.campus.dto.RegisterRequest;
import com.skillswap.campus.dto.UserUpdateRequest;
import com.skillswap.campus.entity.Skill;
import com.skillswap.campus.entity.User;
import com.skillswap.campus.entity.UserRole;
import com.skillswap.campus.exception.ResourceNotFoundException;
import com.skillswap.campus.exception.TooManyLoginAttemptsException;
import org.springframework.stereotype.Service;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.ArrayList;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class UserService {
    private static final int MAX_FAILED_LOGIN_ATTEMPTS = 5;
    private static final long LOGIN_WINDOW_MILLIS = 5 * 60 * 1000L;
    private static final String RATE_LIMIT_MESSAGE = "Too many failed login attempts. Please try again in 5 minutes.";

    private final UserDAO userDAO;
    private final SkillDAO skillDAO;
    private final PasswordEncoder passwordEncoder;
    private final Map<String, FailedLoginWindow> failedLogins = new ConcurrentHashMap<>();

    public UserService(UserDAO userDAO, SkillDAO skillDAO, PasswordEncoder passwordEncoder) {
        this.userDAO = userDAO;
        this.skillDAO = skillDAO;
        this.passwordEncoder = passwordEncoder;
    }

    public List<User> getAllUsers() { return userDAO.findAll(); }

    public List<User> getUsersByRole(UserRole role) {
        return userDAO.findAll().stream().filter(user -> user.getRole() == role).toList();
    }

    public User getUser(Long id) {
        return userDAO.findById(id).orElseThrow(() -> new ResourceNotFoundException("User not found: " + id));
    }

    public User register(RegisterRequest request) {
        if (userDAO.existsByEmailIgnoreCase(request.email())) {
            throw new IllegalArgumentException("An account with this email already exists.");
        }
        User user = new User(request.name(), request.email(), passwordEncoder.encode(request.password()), request.department(),
            request.year(), UserRole.STUDENT);
        user.setBio(request.bio());
        return userDAO.save(user);
    }

    public User login(String email, String password, String ipAddress) {
        String loginKey = normalizedLoginKey(email, ipAddress);
        FailedLoginWindow loginWindow = failedLogins.computeIfAbsent(loginKey, key -> new FailedLoginWindow());
        synchronized (loginWindow) {
            if (loginWindow.isBlocked()) {
                throw new TooManyLoginAttemptsException(RATE_LIMIT_MESSAGE);
            }

            User user = userDAO.findByEmailIgnoreCase(email).orElse(null);
            if (user == null) {
                recordFailedLogin(loginKey, loginWindow);
                throw new IllegalArgumentException("Invalid email or password.");
            }

            boolean validPassword = passwordEncoder.matches(password, user.getPassword());
            if (!validPassword && user.getPassword().equals(password)) {
                user.setPassword(passwordEncoder.encode(password));
                userDAO.save(user);
                validPassword = true;
            }
            if (!validPassword) {
                recordFailedLogin(loginKey, loginWindow);
                throw new IllegalArgumentException("Invalid email or password.");
            }
            failedLogins.remove(loginKey);
            return user;
        }
    }

    private void recordFailedLogin(String loginKey, FailedLoginWindow loginWindow) {
        loginWindow.recordFailure();
        if (loginWindow.isEmpty()) {
            failedLogins.remove(loginKey, loginWindow);
        }
    }

    private String normalizedLoginKey(String email, String ipAddress) {
        return email.trim().toLowerCase(Locale.ROOT) + "|" + ipAddress;
    }

    private static final class FailedLoginWindow {
        private final Deque<Long> failedAt = new ArrayDeque<>();

        synchronized boolean isBlocked() {
            removeExpiredFailures();
            return failedAt.size() >= MAX_FAILED_LOGIN_ATTEMPTS;
        }

        synchronized void recordFailure() {
            removeExpiredFailures();
            failedAt.addLast(System.currentTimeMillis());
        }

        synchronized boolean isEmpty() {
            removeExpiredFailures();
            return failedAt.isEmpty();
        }

        private void removeExpiredFailures() {
            long cutoff = System.currentTimeMillis() - LOGIN_WINDOW_MILLIS;
            while (!failedAt.isEmpty() && failedAt.peekFirst() <= cutoff) {
                failedAt.removeFirst();
            }
        }
    }

    public User updateUser(Long id, UserUpdateRequest request) {
        User user = getUser(id);
        userDAO.findByEmailIgnoreCase(request.email()).filter(existing -> !existing.getId().equals(id)).ifPresent(existing -> {
            throw new IllegalArgumentException("An account with this email already exists.");
        });
        user.setName(request.name());
        user.setEmail(request.email());
        user.setDepartment(request.department());
        user.setYear(request.year());
        user.setBio(request.bio());
        if (request.password() != null && !request.password().isBlank()) {
            user.setPassword(passwordEncoder.encode(request.password()));
        }
        return userDAO.save(user);
    }

    public void deleteUser(Long id, Long actingUserId) {
        User target = getUser(id);
        if (id.equals(actingUserId)) throw new IllegalArgumentException("You cannot remove your own account.");
        if (target.getRole() == UserRole.ADMIN) throw new IllegalArgumentException("Admin accounts cannot be removed.");
        userDAO.deleteById(id);
    }

    public List<User> searchStudentsBySkill(String skillName) {
        if (skillName == null || skillName.isBlank()) return getAllUsers();
        Skill skill = skillDAO.findBySkillNameIgnoreCase(skillName.trim()).orElse(null);
        return skill == null ? new ArrayList<>() : userDAO.findStudentsBySkill(skill.getId());
    }

}