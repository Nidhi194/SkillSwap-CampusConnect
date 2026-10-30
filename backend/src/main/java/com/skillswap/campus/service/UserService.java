package com.skillswap.campus.service;

import com.skillswap.campus.dao.SkillDAO;
import com.skillswap.campus.dao.UserDAO;
import com.skillswap.campus.dto.RegisterRequest;
import com.skillswap.campus.dto.UserUpdateRequest;
import com.skillswap.campus.entity.Skill;
import com.skillswap.campus.entity.User;
import com.skillswap.campus.entity.UserRole;
import com.skillswap.campus.exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.ArrayList;
import java.util.List;

@Service
public class UserService {
    private final UserDAO userDAO;
    private final SkillDAO skillDAO;
    private final PasswordEncoder passwordEncoder;

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

    public User login(String email, String password) {
        User user = userDAO.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new IllegalArgumentException("Invalid email or password."));
        boolean validPassword = passwordEncoder.matches(password, user.getPassword());
        if (!validPassword && user.getPassword().equals(password)) {
            user.setPassword(passwordEncoder.encode(password));
            userDAO.save(user);
            validPassword = true;
        }
        if (!validPassword) {
            throw new IllegalArgumentException("Invalid email or password.");
        }
        return user;
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