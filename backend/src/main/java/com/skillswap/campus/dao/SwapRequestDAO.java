package com.skillswap.campus.dao;

import com.skillswap.campus.config.DBConnection;
import com.skillswap.campus.entity.Request;
import com.skillswap.campus.entity.RequestStatus;
import org.springframework.stereotype.Repository;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Repository
public class SwapRequestDAO {

    public boolean areConnected(Long user1Id, Long user2Id) {
        String sql = "SELECT 1 FROM swap_requests WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)) AND status = 'ACCEPTED'";
        try (Connection connection = DBConnection.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setLong(1, user1Id);
            statement.setLong(2, user2Id);
            statement.setLong(3, user2Id);
            statement.setLong(4, user1Id);
            try (ResultSet results = statement.executeQuery()) {
                return results.next();
            }
        } catch (SQLException exception) {
            throw databaseError(exception);
        }
    }

    public boolean hasPendingRequest(Long user1Id, Long user2Id) {
        String sql = "SELECT 1 FROM swap_requests WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)) AND status = 'PENDING'";
        try (Connection connection = DBConnection.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setLong(1, user1Id);
            statement.setLong(2, user2Id);
            statement.setLong(3, user2Id);
            statement.setLong(4, user1Id);
            try (ResultSet results = statement.executeQuery()) {
                return results.next();
            }
        } catch (SQLException exception) {
            throw databaseError(exception);
        }
    }

    public Request save(Request request) {
        String sql = "INSERT INTO swap_requests (sender_id, receiver_id, skill_id, offered_skill_id, status, created_at) VALUES (?, ?, ?, ?, ?, ?)";
        try (Connection connection = DBConnection.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            statement.setLong(1, request.getSenderId());
            statement.setLong(2, request.getReceiverId());
            if (request.getSkillId() == null) {
                statement.setNull(3, java.sql.Types.INTEGER);
            } else {
                statement.setLong(3, request.getSkillId());
            }
            if (request.getOfferedSkillId() == null) {
                statement.setNull(4, java.sql.Types.BIGINT);
            } else {
                statement.setLong(4, request.getOfferedSkillId());
            }
            statement.setString(5, request.getStatus().name());
            statement.setObject(6, request.getCreatedAt() == null ? LocalDate.now() : request.getCreatedAt());
            statement.executeUpdate();
            try (ResultSet keys = statement.getGeneratedKeys()) {
                if (keys.next()) {
                    request.setId(keys.getLong(1));
                }
            }
            return request;
        } catch (SQLException exception) {
            throw databaseError(exception);
        }
    }

    public List<Request> findForUser(Long userId) {
        String sql = selectSql() + " WHERE r.sender_id = ? OR r.receiver_id = ? ORDER BY r.request_id DESC";
        List<Request> requests = new ArrayList<>();
        try (Connection connection = DBConnection.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setLong(1, userId);
            statement.setLong(2, userId);
            try (ResultSet results = statement.executeQuery()) {
                while (results.next()) {
                    requests.add(mapRequest(results));
                }
            }
            return requests;
        } catch (SQLException exception) {
            throw databaseError(exception);
        }
    }

    public List<Request> findAll() {
        List<Request> requests = new ArrayList<>();
        try (Connection connection = DBConnection.getConnection();
             PreparedStatement statement = connection.prepareStatement(selectSql() + " ORDER BY r.request_id DESC");
             ResultSet results = statement.executeQuery()) {
            while (results.next()) {
                requests.add(mapRequest(results));
            }
            return requests;
        } catch (SQLException exception) {
            throw databaseError(exception);
        }
    }

    public Optional<Request> findById(Long id) {
        String sql = selectSql() + " WHERE r.request_id = ?";
        try (Connection connection = DBConnection.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setLong(1, id);
            try (ResultSet results = statement.executeQuery()) {
                return results.next() ? Optional.of(mapRequest(results)) : Optional.empty();
            }
        } catch (SQLException exception) {
            throw databaseError(exception);
        }
    }

    public Request updateStatus(Long id, RequestStatus status) {
        try (Connection connection = DBConnection.getConnection();
             PreparedStatement statement = connection.prepareStatement(
                     "UPDATE swap_requests SET status = ? WHERE request_id = ?")) {
            statement.setString(1, status.name());
            statement.setLong(2, id);
            statement.executeUpdate();
            return findById(id).orElseThrow();
        } catch (SQLException exception) {
            throw databaseError(exception);
        }
    }

    private Request mapRequest(ResultSet results) throws SQLException {
        Long skillId = results.getObject("skill_id", Long.class);
        Long offeredSkillId = results.getObject("offered_skill_id", Long.class);
        Request request = new Request(results.getLong("sender_id"), results.getLong("receiver_id"), skillId, offeredSkillId);
        request.setId(results.getLong("request_id"));
        request.setStatus(RequestStatus.valueOf(results.getString("status")));
        request.setCreatedAt(results.getObject("created_at", LocalDate.class));
        request.setSenderName(results.getString("sender_name"));
        request.setReceiverName(results.getString("receiver_name"));
        request.setRequestedSkill(results.getString("requested_skill"));
        request.setOfferedSkill(results.getString("offered_skill"));
        return request;
    }

    private String selectSql() {
        return "SELECT r.request_id, r.sender_id, r.receiver_id, r.skill_id, r.offered_skill_id, r.status, r.created_at, "
                + "sender.name AS sender_name, receiver.name AS receiver_name, requested.skill_name AS requested_skill, "
                + "offered.skill_name AS offered_skill FROM swap_requests r "
                + "INNER JOIN users sender ON sender.user_id = r.sender_id "
                + "INNER JOIN users receiver ON receiver.user_id = r.receiver_id "
                + "LEFT JOIN skills requested ON requested.skill_id = r.skill_id "
                + "LEFT JOIN skills offered ON offered.skill_id = r.offered_skill_id";
    }

    private IllegalStateException databaseError(SQLException exception) {
        return new IllegalStateException("Database operation failed: " + exception.getMessage(), exception);
    }
}