package com.skillswap.campus.controller;

import com.skillswap.campus.dto.CreateRequest;
import com.skillswap.campus.dto.RequestResponse;
import com.skillswap.campus.service.RequestService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.access.prepost.PreAuthorize;

import java.util.List;

@RestController
@RequestMapping("/api/requests")
public class RequestController {

    private final RequestService requestService;

    public RequestController(RequestService requestService) {
        this.requestService = requestService;
    }

    @PostMapping
    @PreAuthorize("@securityAccess.canEditUser(#request.senderId())")
    public ResponseEntity<RequestResponse> sendRequest(@Valid @RequestBody CreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(RequestResponse.from(requestService.sendRequest(request)));
    }

    @GetMapping("/user/{userId}")
    @PreAuthorize("@securityAccess.canEditUser(#userId)")
    public List<RequestResponse> getRequests(@PathVariable Long userId) {
        return requestService.getRequestsForUser(userId).stream()
                .map(RequestResponse::from)
                .toList();
    }

    @PutMapping("/{id}/accept")
    @PreAuthorize("@securityAccess.canUpdateRequest(#id)")
    public RequestResponse acceptRequest(@PathVariable Long id) {
        return RequestResponse.from(requestService.acceptRequest(id));
    }

    @PutMapping("/{id}/cancel")
    @PreAuthorize("@securityAccess.canCancelRequest(#id)")
    public RequestResponse cancelRequest(@PathVariable Long id) {
        return RequestResponse.from(requestService.cancelRequest(id));
    }

    @PutMapping("/{id}/disconnect")
    @PreAuthorize("@securityAccess.canDisconnectRequest(#id)")
    public RequestResponse disconnectRequest(@PathVariable Long id) {
        return RequestResponse.from(requestService.disconnectRequest(id));
    }

    @GetMapping
    @PreAuthorize("@securityAccess.isAdmin()")
    public List<RequestResponse> getAllRequests() {
        return requestService.getAllRequests().stream().map(RequestResponse::from).toList();
    }

    @PutMapping("/{id}/reject")
    @PreAuthorize("@securityAccess.canUpdateRequest(#id)")
    public RequestResponse rejectRequest(@PathVariable Long id) {
        return RequestResponse.from(requestService.rejectRequest(id));
    }
}
