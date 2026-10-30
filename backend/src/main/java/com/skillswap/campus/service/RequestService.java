package com.skillswap.campus.service;

import com.skillswap.campus.dao.SkillDAO;
import com.skillswap.campus.dao.SwapRequestDAO;
import com.skillswap.campus.dao.UserDAO;
import com.skillswap.campus.dto.CreateRequest;
import com.skillswap.campus.entity.Request;
import com.skillswap.campus.entity.RequestStatus;
import com.skillswap.campus.exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class RequestService {
    private final SwapRequestDAO swapRequestDAO;
    private final UserDAO userDAO;
    private final SkillDAO skillDAO;

    public RequestService(SwapRequestDAO swapRequestDAO, UserDAO userDAO, SkillDAO skillDAO) {
        this.swapRequestDAO = swapRequestDAO; this.userDAO = userDAO; this.skillDAO = skillDAO;
    }

    public Request sendRequest(CreateRequest requestData) {
        getUser(requestData.senderId()); getUser(requestData.receiverId());
        if (requestData.senderId().equals(requestData.receiverId())) {
            throw new IllegalArgumentException("A user cannot send a request to themselves.");
        }
        if (requestData.skillId() != null) {
            skillDAO.findById(requestData.skillId()).orElseThrow(() -> new ResourceNotFoundException("Skill not found: " + requestData.skillId()));
        }
        if (requestData.offeredSkillId() != null) {
            skillDAO.findById(requestData.offeredSkillId()).orElseThrow(() -> new ResourceNotFoundException("Skill not found: " + requestData.offeredSkillId()));
        }
        if (swapRequestDAO.areConnected(requestData.senderId(), requestData.receiverId())) {
            throw new IllegalArgumentException("You are already connected with this student.");
        }
        if (swapRequestDAO.hasPendingRequest(requestData.senderId(), requestData.receiverId())) {
            throw new IllegalArgumentException("A pending request already exists between you and this student.");
        }
        return swapRequestDAO.save(new Request(requestData.senderId(), requestData.receiverId(), requestData.skillId(), requestData.offeredSkillId()));
    }

    public List<Request> getRequestsForUser(Long userId) { getUser(userId); return swapRequestDAO.findForUser(userId); }
    public Request acceptRequest(Long requestId) { return updateStatus(requestId, RequestStatus.ACCEPTED); }
    public Request rejectRequest(Long requestId) { return updateStatus(requestId, RequestStatus.REJECTED); }

    public Request cancelRequest(Long requestId) { return transition(requestId, RequestStatus.PENDING, RequestStatus.CANCELLED, "Only pending requests can be cancelled."); }
    public Request disconnectRequest(Long requestId) { return transition(requestId, RequestStatus.ACCEPTED, RequestStatus.DISCONNECTED, "Only accepted connections can be disconnected."); }
    public List<Request> getAllRequests() { return swapRequestDAO.findAll(); }

    private Request updateStatus(Long requestId, RequestStatus status) {
        return transition(requestId, RequestStatus.PENDING, status, "Only pending requests can be updated.");
    }

    private Request transition(Long requestId, RequestStatus required, RequestStatus next, String errorMessage) {
        Request request = swapRequestDAO.findById(requestId).orElseThrow(() -> new ResourceNotFoundException("Request not found: " + requestId));
        if (request.getStatus() != required) throw new IllegalArgumentException(errorMessage);
        return swapRequestDAO.updateStatus(requestId, next);
    }

    private void getUser(Long userId) {
        userDAO.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
    }
}