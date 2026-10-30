package com.skillswap.campus.config;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

public final class DBConnection {

    private static final String DEFAULT_URL =
            "jdbc:mysql://localhost:3306/skillswap_db?createDatabaseIfNotExist=true";

    private DBConnection() {
    }

    public static Connection getConnection() throws SQLException {
        return DriverManager.getConnection(
                optional("DB_URL", DEFAULT_URL),
                required("DB_USERNAME"),
                required("DB_PASSWORD")
        );
    }

    private static String lookup(String name) {
        String value = System.getenv(name);
        if (value == null || value.isBlank()) {
            value = System.getProperty(name);
        }
        return value == null || value.isBlank() ? null : value;
    }

    private static String optional(String name, String defaultValue) {
        String value = lookup(name);
        return value == null ? defaultValue : value;
    }

    private static String required(String name) {
        String value = lookup(name);
        if (value == null) {
            throw new IllegalStateException("Missing required setting " + name
                    + ". Set it as an environment variable (see backend/.env.example).");
        }
        return value;
    }
}
