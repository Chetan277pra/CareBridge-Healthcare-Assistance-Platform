package com.carebridge.controller;

import com.carebridge.entity.Notification;
import com.carebridge.entity.User;
import com.carebridge.repository.UserRepository;
import com.carebridge.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;
    private final UserRepository userRepository;

    private User getCurrentUser() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        String username = principal instanceof UserDetails ud ? ud.getUsername() : principal.toString();
        return userRepository.findByEmail(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
    }

    /** GET /api/notifications — last 50 notifications for current user */
    @GetMapping
    public List<Notification> getNotifications() {
        return notificationService.getNotifications(getCurrentUser().getId());
    }

    /** GET /api/notifications/unread — unread notifications */
    @GetMapping("/unread")
    public List<Notification> getUnread() {
        return notificationService.getUnread(getCurrentUser().getId());
    }

    /** GET /api/notifications/unread-count — badge count */
    @GetMapping("/unread-count")
    public Map<String, Long> getUnreadCount() {
        long count = notificationService.getUnreadCount(getCurrentUser().getId());
        return Map.of("count", count);
    }

    /** PUT /api/notifications/{id}/read — mark single notification read */
    @PutMapping("/{id}/read")
    public Notification markRead(@PathVariable Long id) {
        return notificationService.markRead(id, getCurrentUser().getId());
    }

    /** PUT /api/notifications/read-all — mark all notifications read */
    @PutMapping("/read-all")
    public ResponseEntity<Map<String, String>> markAllRead() {
        notificationService.markAllRead(getCurrentUser().getId());
        return ResponseEntity.ok(Map.of("message", "All notifications marked as read"));
    }

    /** DELETE /api/notifications/{id} */
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteNotification(@PathVariable Long id) {
        notificationService.deleteNotification(id, getCurrentUser().getId());
        return ResponseEntity.ok(Map.of("message", "Notification deleted"));
    }
}
