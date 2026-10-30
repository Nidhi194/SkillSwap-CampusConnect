package com.skillswap.campus.dao;

import com.skillswap.campus.config.DBConnection;
import com.skillswap.campus.dto.StatsResponse;
import org.springframework.stereotype.Repository;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

@Repository
public class StatsDAO {
    public StatsResponse load() {
        String sql = "SELECT "
                + "(SELECT COUNT(*) FROM users WHERE role = 'STUDENT'), "
                + "(SELECT COUNT(*) FROM skills), "
                + "(SELECT COUNT(*) FROM swap_requests WHERE status = 'ACCEPTED'), "
                + "(SELECT COUNT(DISTINCT department) FROM users WHERE role = 'STUDENT')";
        try (Connection connection = DBConnection.getConnection();
             Statement statement = connection.createStatement();
             ResultSet results = statement.executeQuery(sql)) {
            results.next();
            return new StatsResponse(results.getLong(1), results.getLong(2), results.getLong(3), results.getLong(4));
        } catch (SQLException exception) {
            throw new IllegalStateException("Database operation failed: " + exception.getMessage(), exception);
        }
    }
}
