package com.skillswap.campus.entity;

import java.time.LocalDate;

public class Request {

    private Long id;
    private Long senderId;
    private Long receiverId;
    private Long skillId;
    private Long offeredSkillId;
    private RequestStatus status = RequestStatus.PENDING;
    private LocalDate createdAt;
    private String senderName;
    private String receiverName;
    private String requestedSkill;
    private String offeredSkill;

    public Request() {
    }

    public Request(Long senderId, Long receiverId, Long skillId, Long offeredSkillId) {
        this.senderId = senderId;
        this.receiverId = receiverId;
        this.skillId = skillId;
        this.offeredSkillId = offeredSkillId;
        this.createdAt = LocalDate.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getSenderId() {
        return senderId;
    }

    public void setSenderId(Long senderId) {
        this.senderId = senderId;
    }

    public Long getReceiverId() {
        return receiverId;
    }

    public void setReceiverId(Long receiverId) {
        this.receiverId = receiverId;
    }

    public Long getSkillId() {
        return skillId;
    }

    public void setSkillId(Long skillId) {
        this.skillId = skillId;
    }

    public Long getOfferedSkillId() {
        return offeredSkillId;
    }

    public void setOfferedSkillId(Long offeredSkillId) {
        this.offeredSkillId = offeredSkillId;
    }

    public RequestStatus getStatus() {
        return status;
    }

    public void setStatus(RequestStatus status) {
        this.status = status;
    }

    public LocalDate getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDate createdAt) {
        this.createdAt = createdAt;
    }

    public String getSenderName() {
        return senderName;
    }

    public void setSenderName(String senderName) {
        this.senderName = senderName;
    }

    public String getReceiverName() {
        return receiverName;
    }

    public void setReceiverName(String receiverName) {
        this.receiverName = receiverName;
    }

    public String getRequestedSkill() {
        return requestedSkill;
    }

    public void setRequestedSkill(String requestedSkill) {
        this.requestedSkill = requestedSkill;
    }

    public String getOfferedSkill() {
        return offeredSkill;
    }

    public void setOfferedSkill(String offeredSkill) {
        this.offeredSkill = offeredSkill;
    }
}
