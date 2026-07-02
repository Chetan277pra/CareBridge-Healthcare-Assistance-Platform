package com.carebridge.controller;

import com.carebridge.dto.DashboardStatsResponse;
import com.carebridge.entity.*;
import com.carebridge.repository.AppointmentRepository;
import com.carebridge.repository.TherapistRepository;
import com.carebridge.repository.HospitalRepository;
import com.carebridge.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final AppointmentRepository appointmentRepository;
    private final UserRepository userRepository;
    private final TherapistRepository therapistRepository;
    private final HospitalRepository hospitalRepository;

    private User getCurrentUser() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        String username = principal instanceof UserDetails ud ? ud.getUsername() : principal.toString();
        return userRepository.findByEmail(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
    }

    // ── Patient Dashboard ────────────────────────────────────────────────────

    @GetMapping("/patient")
    public ResponseEntity<DashboardStatsResponse> getPatientStats() {
        User user = getCurrentUser();
        List<Appointment> all = appointmentRepository.findByPatientEmail(user.getEmail());

        long pending   = count(all, AppointmentStatus.PENDING);
        long accepted  = count(all, AppointmentStatus.ACCEPTED);
        long completed = count(all, AppointmentStatus.COMPLETED);
        long cancelled = count(all, AppointmentStatus.CANCELLED);
        long rejected  = count(all, AppointmentStatus.REJECTED);

        // Find next upcoming accepted appointment
        Appointment next = all.stream()
                .filter(a -> a.getStatus() == AppointmentStatus.ACCEPTED
                        && a.getAppointmentDateTime() != null
                        && a.getAppointmentDateTime().isAfter(LocalDateTime.now()))
                .min(Comparator.comparing(Appointment::getAppointmentDateTime))
                .orElse(null);

        String nextDate = null, nextTime = null, nextProvider = null;
        Long nextId = null;
        if (next != null) {
            nextDate     = next.getAppointmentDate() != null ? next.getAppointmentDate().toString() : null;
            nextTime     = next.getAppointmentTime() != null ? next.getAppointmentTime().toString() : null;
            nextProvider = next.getTherapistEmail() != null ? next.getTherapistEmail() : next.getHospitalEmail();
            nextId       = next.getId();
        }

        return ResponseEntity.ok(DashboardStatsResponse.builder()
                .totalAppointments(all.size())
                .pendingCount(pending)
                .acceptedCount(accepted)
                .completedCount(completed)
                .cancelledCount(cancelled)
                .rejectedCount(rejected)
                .nextAppointmentDate(nextDate)
                .nextAppointmentTime(nextTime)
                .nextAppointmentId(nextId)
                .nextAppointmentProvider(nextProvider)
                .monthlyChart(buildMonthlyChart(all))
                .build());
    }

    // ── Therapist Dashboard ──────────────────────────────────────────────────

    @GetMapping("/therapist")
    public ResponseEntity<DashboardStatsResponse> getTherapistStats() {
        User user = getCurrentUser();
        List<Appointment> all = appointmentRepository.findByTherapistEmail(user.getEmail());

        LocalDate today = LocalDate.now();
        LocalDate monthStart = today.withDayOfMonth(1);

        long todayCount = all.stream()
                .filter(a -> a.getAppointmentDate() != null && a.getAppointmentDate().isEqual(today))
                .count();
        long monthCount = all.stream()
                .filter(a -> a.getAppointmentDate() != null
                        && !a.getAppointmentDate().isBefore(monthStart))
                .count();

        Double rating = therapistRepository.findByEmail(user.getEmail())
                .map(t -> t.getRating())
                .orElse(null);

        return ResponseEntity.ok(DashboardStatsResponse.builder()
                .totalAppointments(all.size())
                .pendingCount(count(all, AppointmentStatus.PENDING))
                .acceptedCount(count(all, AppointmentStatus.ACCEPTED))
                .completedCount(count(all, AppointmentStatus.COMPLETED))
                .cancelledCount(count(all, AppointmentStatus.CANCELLED))
                .rejectedCount(count(all, AppointmentStatus.REJECTED))
                .todayPatients(todayCount)
                .thisMonthPatients(monthCount)
                .averageRating(rating)
                .monthlyChart(buildMonthlyChart(all))
                .build());
    }

    // ── Hospital Dashboard ───────────────────────────────────────────────────

    @GetMapping("/hospital")
    public ResponseEntity<DashboardStatsResponse> getHospitalStats() {
        User user = getCurrentUser();
        List<Appointment> all = appointmentRepository.findByHospitalEmail(user.getEmail());

        LocalDate today = LocalDate.now();
        LocalDate monthStart = today.withDayOfMonth(1);

        long todayCount = all.stream()
                .filter(a -> a.getAppointmentDate() != null && a.getAppointmentDate().isEqual(today))
                .count();
        long monthCount = all.stream()
                .filter(a -> a.getAppointmentDate() != null
                        && !a.getAppointmentDate().isBefore(monthStart))
                .count();

        return ResponseEntity.ok(DashboardStatsResponse.builder()
                .totalAppointments(all.size())
                .pendingCount(count(all, AppointmentStatus.PENDING))
                .acceptedCount(count(all, AppointmentStatus.ACCEPTED))
                .completedCount(count(all, AppointmentStatus.COMPLETED))
                .cancelledCount(count(all, AppointmentStatus.CANCELLED))
                .rejectedCount(count(all, AppointmentStatus.REJECTED))
                .todayTotal(todayCount)
                .monthlyPatients(monthCount)
                .monthlyChart(buildMonthlyChart(all))
                .build());
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private long count(List<Appointment> list, AppointmentStatus status) {
        return list.stream().filter(a -> a.getStatus() == status).count();
    }

    /**
     * Builds a 6-month chart: each entry is { "month": "Jan 2026", "count": N }
     */
    private List<Map<String, Object>> buildMonthlyChart(List<Appointment> appointments) {
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("MMM yyyy");
        LocalDate now = LocalDate.now();

        List<Map<String, Object>> result = new ArrayList<>();
        for (int i = 5; i >= 0; i--) {
            LocalDate month = now.minusMonths(i).withDayOfMonth(1);
            String label = month.format(fmt);
            long cnt = appointments.stream()
                    .filter(a -> a.getRequestedAt() != null
                            && a.getRequestedAt().toLocalDate().getMonth() == month.getMonth()
                            && a.getRequestedAt().toLocalDate().getYear() == month.getYear())
                    .count();
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("month", label);
            entry.put("count", cnt);
            result.add(entry);
        }
        return result;
    }
}
