package com.skillswap.campus.entity;

public class UserSkill {

    private UserSkillId id = new UserSkillId();
    private User user;
    private Skill skill;
    private SkillType skillType;

    public UserSkill() {
    }

    public UserSkill(User user, Skill skill, SkillType skillType) {
        this.user = user;
        this.skill = skill;
        this.skillType = skillType;
        this.id = new UserSkillId(user.getId(), skill.getId());
    }

    public UserSkillId getId() {
        return id;
    }

    public void setId(UserSkillId id) {
        this.id = id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public Skill getSkill() {
        return skill;
    }

    public void setSkill(Skill skill) {
        this.skill = skill;
    }

    public SkillType getSkillType() {
        return skillType;
    }

    public void setSkillType(SkillType skillType) {
        this.skillType = skillType;
    }
}
