package com.carebridge.controller;

import com.carebridge.dto.LeaveRequest;
import com.carebridge.dto.SlotResponse;
import com.carebridge.entity.ProviderLeave;
import com.carebridge.entity.ProviderType;
import com.carebridge.entity.User;
import com.carebridge.entity.UserRole;
import com.carebridge.repository.HospitalRepository;
import com.carebridge.repository.TherapistRepository;
import com.carebridge.repository.UserRepository;
import com.carebridge.service.AvailabilityService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class AvailabilityController {

    private final AvailabilityService availabilityService;
    private final UserRepository userRepository;
    private final TherapistRepository therapistRepository;
    private final HospitalRepository hospitalRepository;

    // ─── Helper ──────────────────────────────────────────────────────────────

    private User getCurrentUser() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        String username = principal instanceof UserDetails
                ? ((UserDetails) principal).getUsername()
                : principal.toString();
        return userRepository.findByEmail(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
    }

    // ─── Public: Get Slots ────────────────────────────────────────────────────

    /**
     * GET /api/availability/therapist/{id}?date=YYYY-MM-DD
     * Returns all slots for the therapist on the given date.
     * Auto-generates slots if not yet created.
     */
    @GetMapping("/availability/therapist/{id}")
    public List<SlotResponse> getTherapistSlots(
            @PathVariable Long id,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {

        if (!therapistRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Therapist not found");
        }
        return availabilityService.getSlotsForDate(ProviderType.THERAPIST, id, date);
    }

    /**
     * GET /api/availability/hospital/{id}?date=YYYY-MM-DD
     * Returns all slots for the hospital on the given date.
     * Auto-generates slots if not yet created.
     */
    @GetMapping("/availability/hospital/{id}")
    public List<SlotResponse> getHospitalSlots(
            @PathVariable Long id,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {

        if (!hospitalRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Hospital not found");
        }
        return availabilityService.getSlotsForDate(ProviderType.HOSPITAL, id, date);
    }

    // ─── Admin/Provider: Generate Slots ───────────────────────────────────────

    /**
     * POST /api/availability/generate
     * Body: { "providerId": 1, "providerType": "THERAPIST" }
     * Manually triggers slot generation for the next 30 days.
     */
    @PostMapping("/availability/generate")
    public ResponseEntity<Map<String, String>> generateSlots(@RequestBody Map<String, Object> body) {
        Long providerId = Long.valueOf(body.get("providerId").toString());
        ProviderType providerType = ProviderType.valueOf(body.get("providerType").toString().toUpperCase());
        availabilityService.generateSlotsIfNeeded(providerType, providerId);
        return ResponseEntity.ok(Map.of("message", "Slots generated successfully for the next 30 days"));
    }

    // ─── Provider: Slot Toggle ────────────────────────────────────────────────

    /**
     * PUT /api/availability/slots/{slotId}/disable
     * Provider disables a specific slot (e.g., block a lunch break).
     */
    @PutMapping("/availability/slots/{slotId}/disable")
    public ResponseEntity<Map<String, String>> disableSlot(@PathVariable Long slotId) {
        User user = getCurrentUser();
        Long providerId = resolveProviderId(user);
        availabilityService.disableSlot(slotId, providerId);
        return ResponseEntity.ok(Map.of("message", "Slot disabled"));
    }

    /**
     * PUT /api/availability/slots/{slotId}/enable
     * Provider re-enables a previously disabled slot.
     */
    @PutMapping("/availability/slots/{slotId}/enable")
    public ResponseEntity<Map<String, String>> enableSlot(@PathVariable Long slotId) {
        User user = getCurrentUser();
        Long providerId = resolveProviderId(user);
        availabilityService.enableSlot(slotId, providerId);
        return ResponseEntity.ok(Map.of("message", "Slot enabled"));
    }

    // ─── Provider: Leave Management ───────────────────────────────────────────

    /**
     * POST /api/provider-leave
     * Mark a full day as leave — disables all slots for that date.
     */
    @PostMapping("/provider-leave")
    public ResponseEntity<ProviderLeave> markLeave(@Valid @RequestBody LeaveRequest req) {
        return ResponseEntity.ok(availabilityService.markLeave(req));
    }

    /**
     * PUT /api/provider-leave/{id}
     * Update an existing leave record — re-enables old date slots and disables new date slots.
     */
    @PutMapping("/provider-leave/{id}")
    public ResponseEntity<ProviderLeave> updateLeave(
            @PathVariable Long id,
            @Valid @RequestBody LeaveRequest req) {
        return ResponseEntity.ok(availabilityService.updateLeave(id, req));
    }


    /**
     * DELETE /api/provider-leave/{id}
     * Remove a leave record — re-generates slots for that date.
     */
    @DeleteMapping("/provider-leave/{id}")
    public ResponseEntity<Map<String, String>> removeLeave(@PathVariable Long id) {
        availabilityService.removeLeave(id);
        return ResponseEntity.ok(Map.of("message", "Leave removed. Slots have been regenerated."));
    }

    /**
     * GET /api/provider-leave/{providerId}?type=THERAPIST
     * List all leave days for a provider.
     */
    @GetMapping("/provider-leave/{providerId}")
    public List<ProviderLeave> getLeaves(
            @PathVariable Long providerId,
            @RequestParam String type) {
        return availabilityService.getLeaves(providerId, ProviderType.valueOf(type.toUpperCase()));
    }

    /**
     * GET /api/availability/provider/slots?date=YYYY-MM-DD
     * Provider fetches their own slots for a date (used by provider dashboard).
     */
    @GetMapping("/availability/provider/slots")
    public List<SlotResponse> getMySlots(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        User user = getCurrentUser();
        ProviderType type;
        Long id;
        if (user.getRole() == UserRole.THERAPIST) {
            type = ProviderType.THERAPIST;
            id = therapistRepository.findByEmail(user.getEmail())
                    .map(t -> t.getId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Therapist profile not found"));
        } else if (user.getRole() == UserRole.HOSPITAL) {
            type = ProviderType.HOSPITAL;
            id = hospitalRepository.findByEmail(user.getEmail())
                    .map(h -> h.getId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Hospital profile not found"));
        } else {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only providers can manage availability");
        }
        return availabilityService.getSlotsForDate(type, id, date);
    }

    // ─── Helper ──────────────────────────────────────────────────────────────

    private Long resolveProviderId(User user) {
        if (user.getRole() == UserRole.THERAPIST) {
            return therapistRepository.findByEmail(user.getEmail())
                    .map(t -> t.getId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Therapist profile not found"));
        } else if (user.getRole() == UserRole.HOSPITAL) {
            return hospitalRepository.findByEmail(user.getEmail())
                    .map(h -> h.getId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Hospital profile not found"));
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only providers can manage slots");
    }
}
