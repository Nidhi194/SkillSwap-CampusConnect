package com.skillswap.campus.dao;

import com.skillswap.campus.config.DBConnection;
import com.skillswap.campus.entity.Skill;
import com.skillswap.campus.entity.SkillType;
import com.skillswap.campus.entity.User;
import com.skillswap.campus.entity.UserSkill;
import com.skillswap.campus.entity.UserSkillId;
import org.springframework.stereotype.Repository;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

@Repository
public class UserSkillDAO {

    private static final String SELECT = "SELECT u.user_id, u.name, u.email, u.department, u.year, u.role, "
            + "s.skill_id, s.skill_name, us.skill_type FROM user_skills us "
            + "INNER JOIN users u ON us.user_id = u.user_id INNER JOIN skills s ON us.skill_id = s.skill_id ";

    public List<UserSkill> findByUserId(Long userId) {
        return find(SELECT + "WHERE us.user_id = ? ORDER BY us.user_skill_id", userId);
    }

    public List<UserSkill> findAll() {
        return find(SELECT + "ORDER BY us.user_skill_id", null);
    }

    public boolean existsById(UserSkillId id) {
        try (Connection connection = DBConnection.getConnection();
             PreparedStatement statement = connection.prepareStatement(
                     "SELECT 1 FROM user_skills WHERE user_id = ? AND skill_id = ?")) {
            statement.setLong(1, id.getUserId());
            statement.setLong(2, id.getSkillId());
            try (ResultSet results = statement.executeQuery()) {
                return results.next();
            }
        } catch (SQLException exception) {
            throw databaseError(exception);
        }
    }

    public UserSkill save(UserSkill userSkill) {
        try (Connection connection = DBConnection.getConnection();
             PreparedStatement statement = connection.prepareStatement(
                     "INSERT INTO user_skills (user_id, skill_id, skill_type) VALUES (?, ?, ?)")) {
            statement.setLong(1, userSkill.getId().getUserId());
            statement.setLong(2, userSkill.getId().getSkillId());
            statement.setString(3, userSkill.getSkillType().name());
            statement.executeUpdate();
            return userSkill;
        } catch (SQLException exception) {
            throw databaseError(exception);
        }
    }

    public void deleteById(UserSkillId id) {
        try (Connection connection = DBConnection.getConnection();
             PreparedStatement statement = connection.prepareStatement(
                     "DELETE FROM user_skills WHERE user_id = ? AND skill_id = ?")) {
            statement.setLong(1, id.getUserId());
            statement.setLong(2, id.getSkillId());
            statement.executeUpdate();
        } catch (SQLException exception) {
            throw databaseError(exception);
        }
    }

    private List<UserSkill> find(String sql, Long userId) {
        List<UserSkill> userSkills = new ArrayList<>();
        try (Connection connection = DBConnection.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            if (userId != null) statement.setLong(1, userId);
            try (ResultSet results = statement.executeQuery()) {
                while (results.next()) {
                    User user = new User();
                    user.setId(results.getLong("user_id"));
                    user.setName(results.getString("name"));
                    user.setEmail(results.getString("email"));
                    user.setDepartment(results.getString("department"));
                    user.setYear(results.getInt("year"));

                    Skill skill = new Skill();
                    skill.setId(results.getLong("skill_id"));
                    skill.setSkillName(results.getString("skill_name"));

                    UserSkill userSkill = new UserSkill();
                    userSkill.setId(new UserSkillId(user.getId(), skill.getId()));
                    userSkill.setUser(user);
                    userSkill.setSkill(skill);
                    userSkill.setSkillType(SkillType.valueOf(results.getString("skill_type")));
                    userSkills.add(userSkill);
                }
            }
            return userSkills;
        } catch (SQLException exception) {
            throw databaseError(exception);
        }
    }

    private IllegalStateException databaseError(SQLException exception) {
        return new IllegalStateException("Database operation failed: " + exception.getMessage(), exception);
    }
}