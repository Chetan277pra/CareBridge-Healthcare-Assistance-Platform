package com.carebridge.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Persistent notification for a user.
 * Survives page refreshes — fetched via REST and pushed via WebSocket.
 */
@Entity
@Table(
    name = "notification",
    indexes = {
        @Index(name = "idx_notif_user", columnList = "user_id, is_read")
    }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** The user this notification belongs to (User.id). */
    @Column(name = "user_id", nullable = false)
    private Integer userId;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, length = 1000)
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private NotificationType type;

    /** Optional link to appointment for navigation. */
    @Column(name = "appointment_id")
    private Long appointmentId;

    @Column(name = "is_read", nullable = false)
    @Builder.Default
    private boolean isRead = false;

    @Column(name = "created_at")
    private LocalDateTime createdAt;
}
