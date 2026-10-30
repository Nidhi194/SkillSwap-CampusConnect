package com.skillswap.campus.dao;

import com.skillswap.campus.config.DBConnection;
import com.skillswap.campus.entity.User;
import com.skillswap.campus.entity.UserRole;
import org.springframework.stereotype.Repository;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Repository
public class UserDAO {

    public List<User> findAll() {
        String sql = "SELECT user_id, name, email, password, department, year, bio, role FROM users ORDER BY user_id";
        List<User> users = new ArrayList<>();
        try (Connection connection = DBConnection.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql);
             ResultSet results = statement.executeQuery()) {
            while (results.next()) {
                users.add(mapUser(results));
            }
            return users;
        } catch (SQLException exception) {
            throw databaseError(exception);
        }
    }

    public Optional<User> findById(Long id) {
        return findOne("SELECT user_id, name, email, password, department, year, bio, role FROM users WHERE user_id = ?", id);
    }

    public Optional<User> findByEmailIgnoreCase(String email) {
        return findOne("SELECT user_id, name, email, password, department, year, bio, role FROM users WHERE LOWER(email) = LOWER(?)", email);
    }

    public boolean existsByEmailIgnoreCase(String email) {
        return findByEmailIgnoreCase(email).isPresent();
    }

    public User save(User user) {
        if (user.getId() == null) {
            String sql = "INSERT INTO users (name, email, password, department, year, bio, role) VALUES (?, ?, ?, ?, ?, ?, ?)";
            try (Connection connection = DBConnection.getConnection();
                 PreparedStatement statement = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
                bindUser(statement, user);
                statement.executeUpdate();
                try (ResultSet keys = statement.getGeneratedKeys()) {
                    if (keys.next()) {
                        user.setId(keys.getLong(1));
                    }
                }
                return user;
            } catch (SQLException exception) {
                throw databaseError(exception);
            }
        }

        String sql = "UPDATE users SET name = ?, email = ?, password = ?, department = ?, year = ?, bio = ?, role = ? WHERE user_id = ?";
        try (Connection connection = DBConnection.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            bindUser(statement, user);
            statement.setLong(8, user.getId());
            statement.executeUpdate();
            return user;
        } catch (SQLException exception) {
            throw databaseError(exception);
        }
    }

    /** Removes dependent rows first so deletion works whether or not FK cascades exist. */
    public void deleteById(Long id) {
        try (Connection connection = DBConnection.getConnection()) {
            connection.setAutoCommit(false);
            try {
                execute(connection, "DELETE FROM swap_requests WHERE sender_id = ? OR receiver_id = ?", id, id);
                execute(connection, "DELETE FROM user_skills WHERE user_id = ?", id);
                execute(connection, "DELETE FROM users WHERE user_id = ?", id);
                connection.commit();
            } catch (SQLException exception) {
                connection.rollback();
                throw exception;
            }
        } catch (SQLException exception) {
            throw databaseError(exception);
        }
    }

    private void execute(Connection connection, String sql, Long... params) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            for (int i = 0; i < params.length; i++) statement.setLong(i + 1, params[i]);
            statement.executeUpdate();
        }
    }

    public List<User> findStudentsBySkill(Long skillId) {
        String sql = "SELECT DISTINCT u.user_id, u.name, u.email, u.password, u.department, u.year, u.bio, u.role "
                + "FROM users u INNER JOIN user_skills us ON us.user_id = u.user_id "
                + "WHERE us.skill_id = ? AND us.skill_type = 'TEACH' AND u.role = 'STUDENT' ORDER BY u.user_id";
        List<User> users = new ArrayList<>();
        try (Connection connection = DBConnection.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setLong(1, skillId);
            try (ResultSet results = statement.executeQuery()) {
                while (results.next()) {
                    users.add(mapUser(results));
                }
            }
            return users;
        } catch (SQLException exception) {
            throw databaseError(exception);
        }
    }

    private Optional<User> findOne(String sql, Object value) {
        try (Connection connection = DBConnection.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            if (value instanceof Long id) {
                statement.setLong(1, id);
            } else {
                statement.setString(1, value.toString());
            }
            try (ResultSet results = statement.executeQuery()) {
                return results.next() ? Optional.of(mapUser(results)) : Optional.empty();
            }
        } catch (SQLException exception) {
            throw databaseError(exception);
        }
    }

    private User mapUser(ResultSet results) throws SQLException {
        User user = new User();
        user.setId(results.getLong("user_id"));
        user.setName(results.getString("name"));
        user.setEmail(results.getString("email"));
        user.setPassword(results.getString("password"));
        user.setDepartment(results.getString("department"));
        user.setYear(results.getInt("year"));
        user.setBio(results.getString("bio"));
        user.setRole(UserRole.valueOf(results.getString("role")));
        return user;
    }

    private void bindUser(PreparedStatement statement, User user) throws SQLException {
        statement.setString(1, user.getName());
        statement.setString(2, user.getEmail());
        statement.setString(3, user.getPassword());
        statement.setString(4, user.getDepartment());
        statement.setInt(5, user.getYear());
        statement.setString(6, user.getBio());
        statement.setString(7, user.getRole().name());
    }

    private IllegalStateException databaseError(SQLException exception) {
        return new IllegalStateException("Database operation failed: " + exception.getMessage(), exception);
    }
}