package com.carebridge.service;

import com.carebridge.entity.Notification;
import com.carebridge.entity.NotificationType;
import com.carebridge.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;

    // ── Create ────────────────────────────────────────────────────────────────

    @Transactional
    public Notification createNotification(Integer userId, String title, String message,
                                           NotificationType type, Long appointmentId) {
        return notificationRepository.save(Notification.builder()
                .userId(userId)
                .title(title)
                .message(message)
                .type(type)
                .appointmentId(appointmentId)
                .isRead(false)
                .createdAt(LocalDateTime.now())
                .build());
    }

    // ── Query ─────────────────────────────────────────────────────────────────

    public List<Notification> getNotifications(Integer userId) {
        // Return latest 50 notifications
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(
                userId, PageRequest.of(0, 50));
    }

    public List<Notification> getUnread(Integer userId) {
        return notificationRepository.findByUserIdAndIsReadFalseOrderByCreatedAtDesc(userId);
    }

    public long getUnreadCount(Integer userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }

    // ── Mark Read ─────────────────────────────────────────────────────────────

    @Transactional
    public Notification markRead(Long notificationId, Integer userId) {
        Notification notif = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification not found"));
        if (!notif.getUserId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
        notif.setRead(true);
        return notificationRepository.save(notif);
    }

    @Transactional
    public void markAllRead(Integer userId) {
        notificationRepository.markAllReadForUser(userId);
    }

    // ── Delete ────────────────────────────────────────────────────────────────

    @Transactional
    public void deleteNotification(Long notificationId, Integer userId) {
        Notification notif = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification not found"));
        if (!notif.getUserId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
        notificationRepository.delete(notif);
    }
}
