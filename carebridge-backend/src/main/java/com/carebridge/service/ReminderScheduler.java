package com.carebridge.service;

import com.carebridge.dto.AppointmentEvent;
import com.carebridge.entity.Appointment;
import com.carebridge.entity.AppointmentStatus;
import com.carebridge.entity.NotificationType;
import com.carebridge.repository.AppointmentRepository;
import com.carebridge.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Scheduler that checks accepted appointments every minute and sends
 * reminder notifications at 24h, 1h, and 15min before the appointment.
 *
 * A small in-memory cache prevents duplicate reminders across scheduler runs
 * (key = appointmentId + threshold). This cache resets on server restart —
 * acceptable since reminders are advisory.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReminderScheduler {

    private final AppointmentRepository appointmentRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final SimpMessagingTemplate messagingTemplate;

    /** Cache to prevent duplicate reminders: "appointmentId:threshold" */
    private final Set<String> sentReminders = new HashSet<>();

    @Scheduled(fixedRate = 60_000) // Every 60 seconds
    public void checkReminders() {
        LocalDateTime now = LocalDateTime.now();

        List<Appointment> accepted = appointmentRepository.findAll().stream()
                .filter(a -> a.getStatus() == AppointmentStatus.ACCEPTED
                        && a.getAppointmentDateTime() != null)
                .toList();

        for (Appointment apt : accepted) {
            LocalDateTime aptTime = apt.getAppointmentDateTime();
            long minutesUntil = java.time.Duration.between(now, aptTime).toMinutes();

            // Check each threshold
            tryRemind(apt, minutesUntil, 1440, "24h"); // 24 hours
            tryRemind(apt, minutesUntil, 60,   "1h");  // 1 hour
            tryRemind(apt, minutesUntil, 15,   "15m"); // 15 minutes
        }
    }

    private void tryRemind(Appointment apt, long minutesUntil, int threshold, String label) {
        // Within ±2 minutes of threshold
        if (minutesUntil < threshold - 2 || minutesUntil > threshold + 2) return;

        String cacheKey = apt.getId() + ":" + label;
        if (sentReminders.contains(cacheKey)) return;

        sentReminders.add(cacheKey);

        String thresholdLabel = switch (label) {
            case "24h" -> "24 hours";
            case "1h"  -> "1 hour";
            case "15m" -> "15 minutes";
            default    -> label;
        };

        // Create notification for patient
        userRepository.findByEmail(apt.getPatientEmail()).ifPresent(patient -> {
            notificationService.createNotification(
                    patient.getId(),
                    "Appointment Reminder",
                    "Your appointment starts in " + thresholdLabel + ". Please be ready.",
                    NotificationType.APPOINTMENT_REMINDER,
                    apt.getId()
            );

            // Push via WebSocket to patient
            AppointmentEvent event = AppointmentEvent.builder()
                    .appointmentId(apt.getId())
                    .status("REMINDER")
                    .patientEmail(apt.getPatientEmail())
                    .message("Your appointment starts in " + thresholdLabel)
                    .updatedAt(LocalDateTime.now())
                    .build();

            messagingTemplate.convertAndSendToUser(
                    apt.getPatientEmail(), "/queue/updates", event);
        });

        log.info("Reminder sent for appointment {} ({} before)", apt.getId(), thresholdLabel);
    }
}
