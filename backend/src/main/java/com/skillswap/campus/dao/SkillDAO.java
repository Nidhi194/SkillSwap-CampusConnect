package com.skillswap.campus.dao;

import com.skillswap.campus.config.DBConnection;
import com.skillswap.campus.entity.Skill;
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
public class SkillDAO {

    public List<Skill> findAll() {
        List<Skill> skills = new ArrayList<>();
        try (Connection connection = DBConnection.getConnection();
             PreparedStatement statement = connection.prepareStatement("SELECT skill_id, skill_name FROM skills ORDER BY skill_id");
             ResultSet results = statement.executeQuery()) {
            while (results.next()) {
                skills.add(mapSkill(results));
            }
            return skills;
        } catch (SQLException exception) {
            throw databaseError(exception);
        }
    }

    public Optional<Skill> findById(Long id) {
        return findOne("SELECT skill_id, skill_name FROM skills WHERE skill_id = ?", id);
    }

    public Optional<Skill> findBySkillNameIgnoreCase(String name) {
        return findOne("SELECT skill_id, skill_name FROM skills WHERE LOWER(skill_name) = LOWER(?)", name);
    }

    public boolean existsBySkillNameIgnoreCase(String name) {
        return findBySkillNameIgnoreCase(name).isPresent();
    }

    public Skill save(Skill skill) {
        try (Connection connection = DBConnection.getConnection();
             PreparedStatement statement = connection.prepareStatement(
                     "INSERT INTO skills (skill_name) VALUES (?)", Statement.RETURN_GENERATED_KEYS)) {
            statement.setString(1, skill.getSkillName());
            statement.executeUpdate();
            try (ResultSet keys = statement.getGeneratedKeys()) {
                if (keys.next()) {
                    skill.setId(keys.getLong(1));
                }
            }
            return skill;
        } catch (SQLException exception) {
            throw databaseError(exception);
        }
    }

    /** Detaches the skill from users and requests first so deletion never hits an FK error or leaves orphans. */
    public void deleteById(Long id) {
        try (Connection connection = DBConnection.getConnection()) {
            connection.setAutoCommit(false);
            try {
                execute(connection, "DELETE FROM user_skills WHERE skill_id = ?", id);
                execute(connection, "UPDATE swap_requests SET skill_id = NULL WHERE skill_id = ?", id);
                execute(connection, "UPDATE swap_requests SET offered_skill_id = NULL WHERE offered_skill_id = ?", id);
                execute(connection, "DELETE FROM skills WHERE skill_id = ?", id);
                connection.commit();
            } catch (SQLException exception) {
                connection.rollback();
                throw exception;
            }
        } catch (SQLException exception) {
            throw databaseError(exception);
        }
    }

    private void execute(Connection connection, String sql, Long id) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setLong(1, id);
            statement.executeUpdate();
        }
    }

    private Optional<Skill> findOne(String sql, Object value) {
        try (Connection connection = DBConnection.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            if (value instanceof Long id) {
                statement.setLong(1, id);
            } else {
                statement.setString(1, value.toString());
            }
            try (ResultSet results = statement.executeQuery()) {
                return results.next() ? Optional.of(mapSkill(results)) : Optional.empty();
            }
        } catch (SQLException exception) {
            throw databaseError(exception);
        }
    }

    private Skill mapSkill(ResultSet results) throws SQLException {
        Skill skill = new Skill();
        skill.setId(results.getLong("skill_id"));
        skill.setSkillName(results.getString("skill_name"));
        return skill;
    }

    private IllegalStateException databaseError(SQLException exception) {
        return new IllegalStateException("Database operation failed: " + exception.getMessage(), exception);
    }
}