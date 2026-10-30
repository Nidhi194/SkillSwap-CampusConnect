package com.skillswap.campus.config;

import com.skillswap.campus.dao.UserDAO;
import com.skillswap.campus.entity.User;
import com.skillswap.campus.entity.UserRole;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Creates the schema (schema.sql is idempotent), patches databases created by older
 * versions, and optionally bootstraps the first admin. Every step is a no-op when
 * already applied, so it is safe on each startup.
 */
@Component
public class DatabaseMigration implements CommandLineRunner {
    private static final Logger log = LoggerFactory.getLogger(DatabaseMigration.class);

    private final UserDAO userDAO;
    private final PasswordEncoder passwordEncoder;
    private final String adminEmail;
    private final String adminPassword;
    private final String adminName;

    public DatabaseMigration(UserDAO userDAO, PasswordEncoder passwordEncoder,
                             @Value("${app.admin.email:}") String adminEmail,
                             @Value("${app.admin.password:}") String adminPassword,
                             @Value("${app.admin.name:Administrator}") String adminName) {
        this.userDAO = userDAO;
        this.passwordEncoder = passwordEncoder;
        this.adminEmail = adminEmail;
        this.adminPassword = adminPassword;
        this.adminName = adminName;
    }

    @Override
    public void run(String... args) {
        try (Connection connection = DBConnection.getConnection()) {
            runSchema(connection);
            addColumnIfMissing(connection, "users", "bio", "TEXT NULL");
            addColumnIfMissing(connection, "swap_requests", "offered_skill_id", "BIGINT NULL");
            addColumnIfMissing(connection, "swap_requests", "created_at", "DATE NULL");
            makeSkillIdNullable(connection);
            widenStatusColumn(connection);
            widenPasswordColumn(connection);
            try (Statement statement = connection.createStatement()) {
                statement.executeUpdate("UPDATE swap_requests SET created_at = CURRENT_DATE WHERE created_at IS NULL");
            }
        } catch (SQLException | IOException exception) {
            throw new IllegalStateException("Database migration failed: " + exception.getMessage(), exception);
        }
        bootstrapAdmin();
    }

    private void runSchema(Connection connection) throws SQLException, IOException {
        String script;
        try (InputStream in = getClass().getResourceAsStream("/schema.sql")) {
            if (in == null) return;
            script = new String(in.readAllBytes(), StandardCharsets.UTF_8);
        }
        StringBuilder cleaned = new StringBuilder();
        for (String line : script.split("\n")) {
            if (!line.trim().startsWith("--")) cleaned.append(line).append('\n');
        }
        try (Statement statement = connection.createStatement()) {
            for (String sql : cleaned.toString().split(";")) {
                if (!sql.isBlank()) statement.execute(sql);
            }
        }
    }

    private void addColumnIfMissing(Connection connection, String table, String column, String definition) throws SQLException {
        if (columnInfo(connection, table, column, "column_name") != null) return;
        try (Statement statement = connection.createStatement()) {
            statement.executeUpdate("ALTER TABLE " + table + " ADD COLUMN " + column + " " + definition);
        }
    }

    /** Legacy databases: keep the existing column type, only drop NOT NULL when present. */
    private void makeSkillIdNullable(Connection connection) throws SQLException {
        if (!"NO".equalsIgnoreCase(columnInfo(connection, "swap_requests", "skill_id", "is_nullable"))) return;
        String type = columnInfo(connection, "swap_requests", "skill_id", "column_type");
        try (Statement statement = connection.createStatement()) {
            statement.executeUpdate("ALTER TABLE swap_requests MODIFY COLUMN skill_id " + type + " NULL");
        } catch (SQLException exception) {
            log.warn("Could not make swap_requests.skill_id nullable: {}", exception.getMessage());
        }
    }

    /** Legacy databases: the status column must accept CANCELLED and DISCONNECTED. */
    private void widenStatusColumn(Connection connection) throws SQLException {
        String type = columnInfo(connection, "swap_requests", "status", "column_type");
        if (type == null) return;
        String lower = type.toLowerCase();
        boolean badEnum = lower.startsWith("enum(") && !(lower.contains("'cancelled'") && lower.contains("'disconnected'"));
        boolean shortVarchar = false;
        if (lower.startsWith("varchar(") || lower.startsWith("char(")) {
            String length = columnInfo(connection, "swap_requests", "status", "character_maximum_length");
            shortVarchar = length != null && Integer.parseInt(length) < 20;
        }
        if (!badEnum && !shortVarchar) return;
        try (Statement statement = connection.createStatement()) {
            statement.executeUpdate("ALTER TABLE swap_requests MODIFY COLUMN status VARCHAR(20) NOT NULL DEFAULT 'PENDING'");
        }
    }

    /** BCrypt hashes are 60 chars; older schemas may have a shorter password column. */
    private void widenPasswordColumn(Connection connection) throws SQLException {
        String length = columnInfo(connection, "users", "password", "character_maximum_length");
        if (length == null || Long.parseLong(length) >= 100) return;
        try (Statement statement = connection.createStatement()) {
            statement.executeUpdate("ALTER TABLE users MODIFY COLUMN password VARCHAR(100) NOT NULL");
        }
    }

    private String columnInfo(Connection connection, String table, String column, String field) throws SQLException {
        String query = "SELECT " + field + " FROM information_schema.columns WHERE table_schema = DATABASE() "
                + "AND table_name = ? AND column_name = ?";
        try (PreparedStatement statement = connection.prepareStatement(query)) {
            statement.setString(1, table);
            statement.setString(2, column);
            try (ResultSet result = statement.executeQuery()) {
                return result.next() ? result.getString(1) : null;
            }
        }
    }

    private void bootstrapAdmin() {
        if (adminEmail.isBlank() || adminPassword.isBlank()) return;
        if (userDAO.findAll().stream().anyMatch(user -> user.getRole() == UserRole.ADMIN)) return;
        User admin = new User(adminName, adminEmail, passwordEncoder.encode(adminPassword), "Administration", 1, UserRole.ADMIN);
        userDAO.save(admin);
        log.info("Created initial admin account {}", adminEmail);
    }
}