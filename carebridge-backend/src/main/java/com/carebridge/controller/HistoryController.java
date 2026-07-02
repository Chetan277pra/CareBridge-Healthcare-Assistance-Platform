package com.carebridge.controller;

import com.carebridge.entity.PredictionHistory;
import com.carebridge.entity.User;
import com.carebridge.repository.UserRepository;
import com.carebridge.service.PredictionHistoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/history")
@RequiredArgsConstructor
public class HistoryController {

    private final PredictionHistoryService service;
    private final UserRepository userRepository;

    private User getCurrentUser() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        String username = principal instanceof UserDetails ud ? ud.getUsername() : principal.toString();
        return userRepository.findByEmail(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
    }

    @GetMapping("/my-history")
    public List<PredictionHistory> getMyHistory() {
        User user = getCurrentUser();
        return service.getUserHistory(Long.valueOf(user.getId()));
    }

    @GetMapping("/my-latest")
    public PredictionHistory getMyLatest() {
        User user = getCurrentUser();
        return service.getLatest(Long.valueOf(user.getId()));
    }

    @GetMapping("/{userId}")
    public List<PredictionHistory> getHistory(@PathVariable Long userId) {
        return service.getUserHistory(userId);
    }

    @GetMapping("/latest/{userId}")
    public PredictionHistory getLatest(@PathVariable Long userId) {
        return service.getLatest(userId);
    }
}