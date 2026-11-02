package com.skillswap.campus.service;

import com.skillswap.campus.dao.SkillDAO;
import com.skillswap.campus.dao.SwapRequestDAO;
import com.skillswap.campus.dao.UserDAO;
import com.skillswap.campus.dto.CreateRequest;
import com.skillswap.campus.entity.Request;
import com.skillswap.campus.entity.RequestStatus;
import com.skillswap.campus.entity.User;
import com.skillswap.campus.entity.UserRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class RequestServiceTest {

    private final TestSwapRequestDAO swapRequestDAO = new TestSwapRequestDAO();
    private final TestUserDAO userDAO = new TestUserDAO();
    private RequestService requestService;

    @BeforeEach
    void setUp() {
        swapRequestDAO.requests.clear();
        swapRequestDAO.connected = false;
        swapRequestDAO.pending = false;
        userDAO.users.clear();
        userDAO.users.put(1L, user(1L));
        userDAO.users.put(2L, user(2L));
        requestService = new RequestService(swapRequestDAO, userDAO, new SkillDAO());
    }

    @Test
    void sendRequestSavesPendingRequest() {
        Request result = requestService.sendRequest(new CreateRequest(1L, 2L, null, null));

        assertEquals(1L, result.getSenderId());
        assertEquals(2L, result.getReceiverId());
        assertEquals(RequestStatus.PENDING, result.getStatus());
        assertEquals(result, swapRequestDAO.saved);
    }

    @Test
    void acceptRequestUpdatesPendingRequest() {
        swapRequestDAO.requests.put(10L, request(10L, RequestStatus.PENDING));

        Request result = requestService.acceptRequest(10L);

        assertEquals(RequestStatus.ACCEPTED, result.getStatus());
    }

    @Test
    void cancelRequestUpdatesPendingRequest() {
        swapRequestDAO.requests.put(10L, request(10L, RequestStatus.PENDING));

        Request result = requestService.cancelRequest(10L);

        assertEquals(RequestStatus.CANCELLED, result.getStatus());
    }

    @Test
    void sendRequestRejectsDuplicatePendingRequest() {
        swapRequestDAO.pending = true;

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> requestService.sendRequest(new CreateRequest(1L, 2L, null, null)));

        assertEquals("A pending request already exists between you and this student.", exception.getMessage());
    }

    private User user(Long id) {
        User user = new User("Student " + id, "student" + id + "@example.edu", "password", "Computer Science", 2, UserRole.STUDENT);
        user.setId(id);
        return user;
    }

    private Request request(Long id, RequestStatus status) {
        Request request = new Request(1L, 2L, null, null);
        request.setId(id);
        request.setStatus(status);
        return request;
    }

    private static final class TestUserDAO extends UserDAO {
        private final Map<Long, User> users = new HashMap<>();

        @Override
        public Optional<User> findById(Long id) {
            return Optional.ofNullable(users.get(id));
        }
    }

    private static final class TestSwapRequestDAO extends SwapRequestDAO {
        private final Map<Long, Request> requests = new HashMap<>();
        private boolean connected;
        private boolean pending;
        private Request saved;

        @Override
        public boolean areConnected(Long user1Id, Long user2Id) {
            return connected;
        }

        @Override
        public boolean hasPendingRequest(Long user1Id, Long user2Id) {
            return pending;
        }

        @Override
        public Request save(Request request) {
            saved = request;
            return request;
        }

        @Override
        public Optional<Request> findById(Long id) {
            return Optional.ofNullable(requests.get(id));
        }

        @Override
        public Request updateStatus(Long id, RequestStatus status) {
            Request request = requests.get(id);
            request.setStatus(status);
            return request;
        }
    }
}
