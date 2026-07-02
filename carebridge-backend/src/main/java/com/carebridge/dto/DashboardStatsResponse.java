package com.carebridge.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * Aggregated stats for the analytics dashboard — tailored per role.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DashboardStatsResponse {

    // ── Common counts ──────────────────────────────────
    private long totalAppointments;
    private long pendingCount;
    private long acceptedCount;
    private long completedCount;
    private long cancelledCount;
    private long rejectedCount;

    // ── Patient-specific ──────────────────────────────
    private String nextAppointmentDate;
    private String nextAppointmentTime;
    private Long   nextAppointmentId;
    private String nextAppointmentProvider;

    // ── Therapist-specific ────────────────────────────
    private long todayPatients;
    private long thisMonthPatients;
    private Double averageRating;

    // ── Hospital-specific ─────────────────────────────
    private long todayTotal;
    private long monthlyPatients;

    // ── Chart data: label → count (last 6 months) ─────
    private List<Map<String, Object>> monthlyChart;
}
