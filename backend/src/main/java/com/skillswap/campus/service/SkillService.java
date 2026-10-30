package com.skillswap.campus.service;

import com.skillswap.campus.dao.SkillDAO;
import com.skillswap.campus.dao.UserDAO;
import com.skillswap.campus.dao.UserSkillDAO;
import com.skillswap.campus.dto.AssignSkillRequest;
import com.skillswap.campus.dto.CreateSkillRequest;
import com.skillswap.campus.entity.Skill;
import com.skillswap.campus.entity.User;
import com.skillswap.campus.entity.UserSkill;
import com.skillswap.campus.entity.UserSkillId;
import com.skillswap.campus.exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class SkillService {
    private final SkillDAO skillDAO;
    private final UserDAO userDAO;
    private final UserSkillDAO userSkillDAO;

    public SkillService(SkillDAO skillDAO, UserDAO userDAO, UserSkillDAO userSkillDAO) {
        this.skillDAO = skillDAO; this.userDAO = userDAO; this.userSkillDAO = userSkillDAO;
    }

    public List<Skill> getAllSkills() { return skillDAO.findAll(); }

    public Skill createSkill(CreateSkillRequest request) {
        String skillName = request.skillName().trim();
        if (skillDAO.existsBySkillNameIgnoreCase(skillName)) throw new IllegalArgumentException("This skill already exists.");
        return skillDAO.save(new Skill(skillName));
    }

    public void deleteSkill(Long skillId) {
        skillDAO.findById(skillId).orElseThrow(() -> new ResourceNotFoundException("Skill not found: " + skillId));
        skillDAO.deleteById(skillId);
    }

    public List<UserSkill> getUserSkills(Long userId) {
        ensureUserExists(userId); return userSkillDAO.findByUserId(userId);
    }

    public List<UserSkill> getAllUserSkills() { return userSkillDAO.findAll(); }

    public UserSkill addSkillToUser(Long userId, AssignSkillRequest request) {
        User user = ensureUserExists(userId);
        Skill skill = skillDAO.findById(request.skillId()).orElseThrow(() -> new ResourceNotFoundException("Skill not found: " + request.skillId()));
        UserSkillId id = new UserSkillId(userId, request.skillId());
        if (userSkillDAO.existsById(id)) throw new IllegalArgumentException("This skill is already listed for the user.");
        UserSkill userSkill = new UserSkill();
        userSkill.setId(id); userSkill.setUser(user); userSkill.setSkill(skill); userSkill.setSkillType(request.skillType());
        return userSkillDAO.save(userSkill);
    }

    public void removeSkillFromUser(Long userId, Long skillId) {
        ensureUserExists(userId);
        UserSkillId id = new UserSkillId(userId, skillId);
        if (!userSkillDAO.existsById(id)) throw new ResourceNotFoundException("User skill not found.");
        userSkillDAO.deleteById(id);
    }

    private User ensureUserExists(Long userId) {
        return userDAO.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
    }
}