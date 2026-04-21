package com.carebridge.controller;

import com.carebridge.dto.AppointmentRequest;
import com.carebridge.entity.Appointment;
import com.carebridge.entity.Hospital;
import com.carebridge.entity.Therapist;
import com.carebridge.entity.User;
import com.carebridge.repository.AppointmentRepository;
import com.carebridge.repository.HospitalRepository;
import com.carebridge.repository.TherapistRepository;
import com.carebridge.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/appointments")
@RequiredArgsConstructor
public class AppointmentController {

    private final AppointmentRepository appointmentRepository;
    private final TherapistRepository therapistRepository;
    private final HospitalRepository hospitalRepository;
    private final UserRepository userRepository;

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
                .status("pending")
                .specialization(request.getSpecialization())
                .therapistEmail(therapist != null ? therapist.getEmail() : null)
                .hospitalEmail(hospital != null ? hospital.getEmail() : null)
                .requestedAt(LocalDateTime.now())
                .build();

        return ResponseEntity.ok(appointmentRepository.save(appointment));
    }

    @PutMapping("/{id}/accept")
    public ResponseEntity<Appointment> acceptAppointment(@PathVariable Long id) {
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Appointment not found"));
        appointment.setStatus("accepted");
        return ResponseEntity.ok(appointmentRepository.save(appointment));
    }

    @PutMapping("/{id}/reject")
    public ResponseEntity<Appointment> rejectAppointment(@PathVariable Long id) {
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Appointment not found"));
        appointment.setStatus("rejected");
        return ResponseEntity.ok(appointmentRepository.save(appointment));
    }
}
