package com.carebridge.controller;

import com.carebridge.dto.AppointmentEvent;
import com.carebridge.dto.AppointmentRequest;
import com.carebridge.dto.AppointmentResponse;
import com.carebridge.entity.*;
import com.carebridge.repository.AppointmentRepository;
import com.carebridge.repository.HospitalRepository;
import com.carebridge.repository.TherapistRepository;
import com.carebridge.repository.UserRepository;
import com.carebridge.service.AvailabilityService;
import com.carebridge.service.NotificationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/appointments")
@RequiredArgsConstructor
public class AppointmentController {

    private final AppointmentRepository appointmentRepository;
    private final TherapistRepository therapistRepository;
    private final HospitalRepository hospitalRepository;
    private final UserRepository userRepository;
    private final AvailabilityService availabilityService;
    private final NotificationService notificationService;
    private final SimpMessagingTemplate messagingTemplate;

    // ─── WebSocket Broadcast ──────────────────────────────────────────────────

    private void broadcastAppointmentEvent(Appointment apt, String status, String message) {
        AppointmentEvent event = AppointmentEvent.builder()
                .appointmentId(apt.getId())
                .status(status)
                .patientEmail(apt.getPatientEmail())
                .therapistEmail(apt.getTherapistEmail())
                .hospitalEmail(apt.getHospitalEmail())
                .appointmentDate(apt.getAppointmentDate() != null ? apt.getAppointmentDate().toString() : null)
                .appointmentTime(apt.getAppointmentTime() != null ? apt.getAppointmentTime().toString() : null)
                .updatedAt(LocalDateTime.now())
                .message(message)
                .build();

        // Broadcast to all subscribers (provider dashboards)
        messagingTemplate.convertAndSend("/topic/appointments", event);

        // Send to specific patient
        if (apt.getPatientEmail() != null) {
            messagingTemplate.convertAndSendToUser(apt.getPatientEmail(), "/queue/updates", event);
        }
        // Send to therapist
        if (apt.getTherapistEmail() != null) {
            messagingTemplate.convertAndSendToUser(apt.getTherapistEmail(), "/queue/updates", event);
        }
        // Send to hospital
        if (apt.getHospitalEmail() != null) {
            messagingTemplate.convertAndSendToUser(apt.getHospitalEmail(), "/queue/updates", event);
        }
    }

    private User getCurrentUser() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        String username;
        if (principal instanceof UserDetails) {
            username = ((UserDetails) principal).getUsername();
        } else {
            username = principal.toString();
        }
        return userRepository.findByEmail(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
    }

    // --- EXISTING ENDPOINTS FOR BACKWARD COMPATIBILITY ---

    @GetMapping("/therapist")
    public List<Appointment> getAppointmentsForTherapist(@RequestParam String email) {
        return appointmentRepository.findByTherapistEmail(email);
    }

    @GetMapping("/hospital")
    public List<Appointment> getAppointmentsForHospital(@RequestParam String email) {
        return appointmentRepository.findByHospitalEmail(email);
    }

    @GetMapping("/patient")
    public List<Appointment> getAppointmentsForPatient(@RequestParam String email) {
        return appointmentRepository.findByPatientEmail(email);
    }

    @PostMapping("/request")
    public ResponseEntity<Appointment> requestAppointment(@RequestBody AppointmentRequest request) {
        User patient = userRepository.findByEmail(request.getPatientEmail())
                .orElseThrow(() -> new IllegalArgumentException("Unable to resolve patient by email"));

        Therapist therapist = null;
        if (request.getTherapistQuery() != null && !request.getTherapistQuery().isBlank()) {
            therapist = therapistRepository.findAll().stream()
                    .filter(t -> t.getName() != null && t.getName().equalsIgnoreCase(request.getTherapistQuery()))
                    .findFirst().orElse(null);
        }
        if (therapist == null && request.getSpecialization() != null && !request.getSpecialization().isBlank()) {
            therapist = therapistRepository.findTopBySpecializationIgnoreCaseOrderByRatingDesc(request.getSpecialization())
                    .or(() -> therapistRepository.findTopBySpecializationContainingIgnoreCaseOrderByRatingDesc(request.getSpecialization()))
                    .orElse(null);
        }
        if (therapist == null) {
            therapist = therapistRepository.findAll().stream().findFirst().orElse(null);
        }

        Hospital hospital = null;
        if (request.getHospitalQuery() != null && !request.getHospitalQuery().isBlank()) {
            hospital = hospitalRepository.findAll().stream()
                    .filter(h -> h.getName() != null && h.getName().equalsIgnoreCase(request.getHospitalQuery()))
                    .findFirst().orElse(null);
        }
        if (hospital == null && request.getSpecialization() != null && !request.getSpecialization().isBlank()) {
            hospital = hospitalRepository.findTopBySpecializationIgnoreCaseOrderByRatingDesc(request.getSpecialization())
                    .or(() -> hospitalRepository.findTopBySpecializationContainingIgnoreCaseOrderByRatingDesc(request.getSpecialization()))
                    .orElse(null);
        }
        if (hospital == null) {
            hospital = hospitalRepository.findTopByOrderByRatingDesc();
        }

        Appointment appointment = Appointment.builder()
                .patientName(patient.getFullName())
                .patientEmail(patient.getEmail())
                .patientPhone(patient.getPhone())
                .disease(request.getDisease())
                .message(request.getMessage())
                .status(AppointmentStatus.PENDING)
                .specialization(request.getSpecialization())
                .therapistEmail(therapist != null ? therapist.getEmail() : null)
                .hospitalEmail(hospital != null ? hospital.getEmail() : null)
                .requestedAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        return ResponseEntity.ok(appointmentRepository.save(appointment));
    }

    // --- NEW APPOINTMENT BOOKING & LIFECYCLE ENDPOINTS ---

    @Transactional
    @PostMapping("/book")
    public ResponseEntity<AppointmentResponse> bookAppointment(@Valid @RequestBody AppointmentRequest request) {
        User patient = getCurrentUser();
        if (patient.getRole() != UserRole.PATIENT) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only patients can book appointments");
        }

        if (request.getAppointmentDate().isBefore(LocalDate.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Appointment date cannot be in the past");
        }

        Therapist therapist = null;
        if (request.getTherapistId() != null) {
            therapist = therapistRepository.findById(request.getTherapistId()).orElse(null);
        }
        if (therapist == null && request.getTherapistQuery() != null && !request.getTherapistQuery().isBlank()) {
            therapist = therapistRepository.findAll().stream()
                    .filter(t -> t.getName() != null && t.getName().equalsIgnoreCase(request.getTherapistQuery()))
                    .findFirst().orElse(null);
        }
        if (therapist == null && request.getSpecialization() != null && !request.getSpecialization().isBlank()) {
            therapist = therapistRepository.findTopBySpecializationIgnoreCaseOrderByRatingDesc(request.getSpecialization())
                    .or(() -> therapistRepository.findTopBySpecializationContainingIgnoreCaseOrderByRatingDesc(request.getSpecialization()))
                    .orElse(null);
        }
        if (therapist == null) {
            therapist = therapistRepository.findAll().stream().findFirst().orElse(null);
        }

        Hospital hospital = null;
        if (request.getHospitalId() != null) {
            hospital = hospitalRepository.findById(request.getHospitalId()).orElse(null);
        }
        if (hospital == null && request.getHospitalQuery() != null && !request.getHospitalQuery().isBlank()) {
            hospital = hospitalRepository.findAll().stream()
                    .filter(h -> h.getName() != null && h.getName().equalsIgnoreCase(request.getHospitalQuery()))
                    .findFirst().orElse(null);
        }
        if (hospital == null && request.getSpecialization() != null && !request.getSpecialization().isBlank()) {
            hospital = hospitalRepository.findTopBySpecializationIgnoreCaseOrderByRatingDesc(request.getSpecialization())
                    .or(() -> hospitalRepository.findTopBySpecializationContainingIgnoreCaseOrderByRatingDesc(request.getSpecialization()))
                    .orElse(null);
        }
        if (hospital == null) {
            hospital = hospitalRepository.findTopByOrderByRatingDesc();
        }

        Appointment appointment = Appointment.builder()
                .patientName(patient.getFullName())
                .patientEmail(patient.getEmail())
                .patientPhone(patient.getPhone())
                .disease(request.getDisease() != null ? request.getDisease() : "General Consultation")
                .message(request.getMessage())
                .status(AppointmentStatus.PENDING)
                .specialization(request.getSpecialization() != null ? request.getSpecialization() : (therapist != null ? therapist.getSpecialization() : null))
                .therapistEmail(therapist != null ? therapist.getEmail() : null)
                .hospitalEmail(hospital != null ? hospital.getEmail() : null)
                .appointmentDate(request.getAppointmentDate())
                .appointmentTime(request.getAppointmentTime())
                .appointmentDateTime(LocalDateTime.of(request.getAppointmentDate(), request.getAppointmentTime()))
                .reasonForVisit(request.getReasonForVisit())
                .notes(request.getNotes())
                .requestedAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        // ─── Slot Reservation (atomic, pessimistic lock) ───────────────────
        // If a slotId is provided, reserve it now. If the slot is already taken,
        // this throws 409 Conflict — the appointment is NOT saved.
        if (request.getSlotId() != null) {
            AvailabilitySlot reservedSlot = availabilityService.reserveSlot(request.getSlotId());
            appointment.setSlotId(reservedSlot.getId());
            // Override appointment time from the slot for consistency
            appointment.setAppointmentTime(reservedSlot.getStartTime());
            appointment.setAppointmentDate(reservedSlot.getSlotDate());
            appointment.setAppointmentDateTime(
                    LocalDateTime.of(reservedSlot.getSlotDate(), reservedSlot.getStartTime()));
        }

        Appointment saved = appointmentRepository.save(appointment);

        // ─── Notify patient ────────────────────────────────────────────────────
        User currentPatient = getCurrentUser();
        notificationService.createNotification(
                currentPatient.getId(),
                "Appointment Submitted",
                "Your appointment request has been sent successfully.",
                NotificationType.APPOINTMENT_REQUEST,
                saved.getId());

        // ─── Broadcast event ───────────────────────────────────────────────────
        broadcastAppointmentEvent(saved, "PENDING", "New appointment request");

        return ResponseEntity.ok(AppointmentResponse.builder()
                .appointmentId(saved.getId())
                .status(saved.getStatus().name())
                .message("Appointment request submitted successfully.")
                .build());
    }

    @GetMapping("/history")
    public List<Appointment> getAppointmentsHistory(@RequestParam(required = false) String email) {
        User user = getCurrentUser();
        String queryEmail = (email != null && !email.isBlank()) ? email : user.getEmail();

        // Enforce role-based isolation if querying other than own email
        if (!user.getEmail().equalsIgnoreCase(queryEmail)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied to history of other accounts");
        }

        if (user.getRole() == UserRole.PATIENT) {
            return appointmentRepository.findByPatientEmail(queryEmail);
        } else if (user.getRole() == UserRole.THERAPIST) {
            return appointmentRepository.findByTherapistEmail(queryEmail);
        } else if (user.getRole() == UserRole.HOSPITAL) {
            return appointmentRepository.findByHospitalEmail(queryEmail);
        }
        return Collections.emptyList();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Appointment> getAppointmentById(@PathVariable Long id) {
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Appointment not found"));
        
        User user = getCurrentUser();
        boolean isPatient = user.getEmail().equalsIgnoreCase(appointment.getPatientEmail());
        boolean isTherapist = appointment.getTherapistEmail() != null && user.getEmail().equalsIgnoreCase(appointment.getTherapistEmail());
        boolean isHospital = appointment.getHospitalEmail() != null && user.getEmail().equalsIgnoreCase(appointment.getHospitalEmail());

        if (!isPatient && !isTherapist && !isHospital) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }

        return ResponseEntity.ok(appointment);
    }

    @PutMapping("/{id}/accept")
    public ResponseEntity<Map<String, String>> acceptAppointment(@PathVariable Long id) {
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Appointment not found"));
        
        User user = getCurrentUser();
        boolean isTherapist = appointment.getTherapistEmail() != null && user.getEmail().equalsIgnoreCase(appointment.getTherapistEmail());
        boolean isHospital = appointment.getHospitalEmail() != null && user.getEmail().equalsIgnoreCase(appointment.getHospitalEmail());

        if (!isTherapist && !isHospital) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }

        appointment.setStatus(AppointmentStatus.ACCEPTED);
        appointment.setApprovedAt(LocalDateTime.now());
        appointment.setUpdatedAt(LocalDateTime.now());
        appointmentRepository.save(appointment);

        // Notify patient
        userRepository.findByEmail(appointment.getPatientEmail()).ifPresent(patient ->
                notificationService.createNotification(
                        patient.getId(),
                        "Appointment Confirmed 🎉",
                        "Your therapist/hospital has accepted your appointment.",
                        NotificationType.APPOINTMENT_ACCEPTED,
                        appointment.getId()));

        broadcastAppointmentEvent(appointment, "ACCEPTED", "Appointment confirmed");

        Map<String, String> response = new HashMap<>();
        response.put("status", "ACCEPTED");
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/reject")
    public ResponseEntity<Map<String, String>> rejectAppointment(@PathVariable Long id) {
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Appointment not found"));
        
        User user = getCurrentUser();
        boolean isTherapist = appointment.getTherapistEmail() != null && user.getEmail().equalsIgnoreCase(appointment.getTherapistEmail());
        boolean isHospital = appointment.getHospitalEmail() != null && user.getEmail().equalsIgnoreCase(appointment.getHospitalEmail());

        if (!isTherapist && !isHospital) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }

        appointment.setStatus(AppointmentStatus.REJECTED);
        appointment.setRejectedAt(LocalDateTime.now());
        appointment.setUpdatedAt(LocalDateTime.now());
        appointmentRepository.save(appointment);

        // Release the slot so another patient can book it
        availabilityService.releaseSlot(appointment.getSlotId());

        // Notify patient
        userRepository.findByEmail(appointment.getPatientEmail()).ifPresent(patient ->
                notificationService.createNotification(
                        patient.getId(),
                        "Appointment Rejected",
                        "Your appointment request was rejected. You may book a new slot.",
                        NotificationType.APPOINTMENT_REJECTED,
                        appointment.getId()));

        broadcastAppointmentEvent(appointment, "REJECTED", "Appointment rejected");

        Map<String, String> response = new HashMap<>();
        response.put("status", "REJECTED");
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/cancel")
    public ResponseEntity<Map<String, String>> cancelAppointment(@PathVariable Long id) {
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Appointment not found"));
        
        User user = getCurrentUser();
        if (!user.getEmail().equalsIgnoreCase(appointment.getPatientEmail())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }

        if (appointment.getStatus() != AppointmentStatus.PENDING && appointment.getStatus() != AppointmentStatus.ACCEPTED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot cancel appointment in status: " + appointment.getStatus());
        }

        appointment.setStatus(AppointmentStatus.CANCELLED);
        appointment.setCancelledAt(LocalDateTime.now());
        appointment.setUpdatedAt(LocalDateTime.now());
        appointmentRepository.save(appointment);

        // Release the slot so another patient can book it
        availabilityService.releaseSlot(appointment.getSlotId());

        // Notify patient
        userRepository.findByEmail(appointment.getPatientEmail()).ifPresent(patient ->
                notificationService.createNotification(
                        patient.getId(),
                        "Appointment Cancelled",
                        "Your appointment has been cancelled.",
                        NotificationType.APPOINTMENT_CANCELLED,
                        appointment.getId()));

        broadcastAppointmentEvent(appointment, "CANCELLED", "Appointment cancelled");

        Map<String, String> response = new HashMap<>();
        response.put("status", "CANCELLED");
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/complete")
    public ResponseEntity<Map<String, String>> completeAppointment(@PathVariable Long id) {
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Appointment not found"));
        
        User user = getCurrentUser();
        boolean isTherapist = appointment.getTherapistEmail() != null && user.getEmail().equalsIgnoreCase(appointment.getTherapistEmail());
        boolean isHospital = appointment.getHospitalEmail() != null && user.getEmail().equalsIgnoreCase(appointment.getHospitalEmail());

        if (!isTherapist && !isHospital) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }

        appointment.setStatus(AppointmentStatus.COMPLETED);
        appointment.setCompletedAt(LocalDateTime.now());
        appointment.setUpdatedAt(LocalDateTime.now());
        appointmentRepository.save(appointment);

        // Notify patient
        userRepository.findByEmail(appointment.getPatientEmail()).ifPresent(patient ->
                notificationService.createNotification(
                        patient.getId(),
                        "Appointment Completed ✅",
                        "Your appointment is complete. Thank you for using CareBridge!",
                        NotificationType.APPOINTMENT_COMPLETED,
                        appointment.getId()));

        broadcastAppointmentEvent(appointment, "COMPLETED", "Appointment completed");

        Map<String, String> response = new HashMap<>();
        response.put("status", "COMPLETED");
        return ResponseEntity.ok(response);
    }

    @GetMapping("/status/{status}")
    public List<Appointment> getAppointmentsByStatus(@PathVariable AppointmentStatus status) {
        User user = getCurrentUser();
        List<Appointment> list;
        if (user.getRole() == UserRole.PATIENT) {
            list = appointmentRepository.findByPatientEmail(user.getEmail());
        } else if (user.getRole() == UserRole.THERAPIST) {
            list = appointmentRepository.findByTherapistEmail(user.getEmail());
        } else if (user.getRole() == UserRole.HOSPITAL) {
            list = appointmentRepository.findByHospitalEmail(user.getEmail());
        } else {
            list = Collections.emptyList();
        }
        return list.stream()
                .filter(a -> a.getStatus() == status)
                .collect(Collectors.toList());
    }
}
