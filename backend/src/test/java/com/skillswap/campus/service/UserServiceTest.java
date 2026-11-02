package com.skillswap.campus.service;

import com.skillswap.campus.dao.SkillDAO;
import com.skillswap.campus.dao.UserDAO;
import com.skillswap.campus.entity.User;
import com.skillswap.campus.entity.UserRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class UserServiceTest {

    private final TestUserDAO userDAO = new TestUserDAO();
    private final TestPasswordEncoder passwordEncoder = new TestPasswordEncoder();
    private UserService userService;

    @BeforeEach
    void setUp() {
        userDAO.user = null;
        userService = new UserService(userDAO, new SkillDAO(), passwordEncoder);
    }

    @Test
    void loginReturnsUserForCorrectPassword() {
        User user = user(1L, "hashed-password");
        userDAO.user = user;
        passwordEncoder.valid = true;

        User result = userService.login("student@example.edu", "correct-password", "127.0.0.1");

        assertEquals(user, result);
    }

    @Test
    void loginRejectsWrongPassword() {
        userDAO.user = user(1L, "hashed-password");
        passwordEncoder.valid = false;

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> userService.login("student@example.edu", "wrong-password", "127.0.0.1"));

        assertEquals("Invalid email or password.", exception.getMessage());
    }

    @Test
    void loginRejectsUnknownEmail() {
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> userService.login("missing@example.edu", "any-password", "127.0.0.1"));

        assertEquals("Invalid email or password.", exception.getMessage());
    }

    private User user(Long id, String password) {
        User user = new User("Student", "student@example.edu", password, "Computer Science", 2, UserRole.STUDENT);
        user.setId(id);
        return user;
    }

    private static final class TestUserDAO extends UserDAO {
        private User user;

        @Override
        public Optional<User> findByEmailIgnoreCase(String email) {
            return user == null ? Optional.empty() : Optional.of(user);
        }
    }

    private static final class TestPasswordEncoder implements org.springframework.security.crypto.password.PasswordEncoder {
        private boolean valid;

        @Override
        public String encode(CharSequence rawPassword) {
            return rawPassword.toString();
        }

        @Override
        public boolean matches(CharSequence rawPassword, String encodedPassword) {
            return valid;
        }
    }
}
