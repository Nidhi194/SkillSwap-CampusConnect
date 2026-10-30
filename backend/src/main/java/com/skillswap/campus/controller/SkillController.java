package com.skillswap.campus.controller;

import com.skillswap.campus.dto.AssignSkillRequest;
import com.skillswap.campus.dto.CreateSkillRequest;
import com.skillswap.campus.dto.UserSkillResponse;
import com.skillswap.campus.entity.Skill;
import com.skillswap.campus.service.SkillService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.access.prepost.PreAuthorize;

import java.util.List;

@RestController
@RequestMapping("/api")
public class SkillController {

    private final SkillService skillService;

    public SkillController(SkillService skillService) {
        this.skillService = skillService;
    }

    @GetMapping("/skills")
    public List<Skill> getSkills() {
        return skillService.getAllSkills();
    }

    @PostMapping("/skills")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Skill> createSkill(@Valid @RequestBody CreateSkillRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(skillService.createSkill(request));
    }

    @DeleteMapping("/skills/{id}")
    @PreAuthorize("@securityAccess.isAdmin()")
    public ResponseEntity<Void> deleteSkill(@PathVariable Long id) {
        skillService.deleteSkill(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/users/{userId}/skills")
    @PreAuthorize("@securityAccess.canEditUser(#userId)")
    public ResponseEntity<UserSkillResponse> addSkillToUser(
            @PathVariable Long userId,
            @Valid @RequestBody AssignSkillRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(UserSkillResponse.from(skillService.addSkillToUser(userId, request)));
    }

    @GetMapping("/user-skills")
    public List<UserSkillResponse> getAllUserSkills() {
        return skillService.getAllUserSkills().stream().map(UserSkillResponse::from).toList();
    }

    @GetMapping("/users/{userId}/skills")
    public List<UserSkillResponse> getUserSkills(@PathVariable Long userId) {
        return skillService.getUserSkills(userId).stream()
                .map(UserSkillResponse::from)
                .toList();
    }

    @DeleteMapping("/users/{userId}/skills/{skillId}")
    @PreAuthorize("@securityAccess.canEditUser(#userId)")
    public ResponseEntity<Void> removeSkillFromUser(
            @PathVariable Long userId,
            @PathVariable Long skillId
    ) {
        skillService.removeSkillFromUser(userId, skillId);
        return ResponseEntity.noContent().build();
    }
}
