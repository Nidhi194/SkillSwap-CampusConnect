package com.skillswap.campus.dto;

import com.skillswap.campus.entity.Request;
import com.skillswap.campus.entity.RequestStatus;

import java.time.LocalDate;

public record RequestResponse(
        Long id,
        Long senderId,
        Long receiverId,
        Long skillId,
        Long offeredSkillId,
        String senderName,
        String receiverName,
        String requestedSkill,
        String offeredSkill,
        LocalDate createdAt,
        RequestStatus status
) {
    public static RequestResponse from(Request request) {
        return new RequestResponse(
                request.getId(),
                request.getSenderId(),
                request.getReceiverId(),
                request.getSkillId(),
                request.getOfferedSkillId(),
                request.getSenderName(),
                request.getReceiverName(),
                request.getRequestedSkill(),
                request.getOfferedSkill(),
                request.getCreatedAt(),
                request.getStatus()
        );
    }
}
