package com.carebridge.service;

import com.carebridge.dto.LeaveRequest;
import com.carebridge.dto.SlotResponse;
import com.carebridge.entity.AvailabilitySlot;
import com.carebridge.entity.ProviderLeave;
import com.carebridge.entity.ProviderType;
import com.carebridge.repository.AvailabilitySlotRepository;
import com.carebridge.repository.ProviderLeaveRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AvailabilityService {

    // ─── Configuration constants ──────────────────────────────────────────────

    private static final int SLOT_DURATION_MINUTES = 30;
    private static final int GENERATION_DAYS = 30;

    private static final LocalTime THERAPIST_START = LocalTime.of(9, 0);
    private static final LocalTime THERAPIST_END   = LocalTime.of(17, 0);

    private static final LocalTime HOSPITAL_START  = LocalTime.of(8, 0);
    private static final LocalTime HOSPITAL_END    = LocalTime.of(20, 0);

    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");

    // ─── Dependencies ─────────────────────────────────────────────────────────

    private final AvailabilitySlotRepository slotRepository;
    private final ProviderLeaveRepository leaveRepository;

    // ─── Slot Generation ─────────────────────────────────────────────────────

    /**
     * Idempotent: generates slots for the next GENERATION_DAYS days from today.
     * Skips dates that already have slots. Skips leave days.
     * Called automatically before returning slots for a provider.
     */
    @Transactional
    public void generateSlotsIfNeeded(ProviderType providerType, Long providerId) {
        LocalDate today = LocalDate.now();
        LocalTime start = providerType == ProviderType.THERAPIST ? THERAPIST_START : HOSPITAL_START;
        LocalTime end   = providerType == ProviderType.THERAPIST ? THERAPIST_END   : HOSPITAL_END;

        List<AvailabilitySlot> toSave = new ArrayList<>();

        for (int i = 0; i < GENERATION_DAYS; i++) {
            LocalDate date = today.plusDays(i);

            // Skip if slots already exist for this date
            if (slotRepository.existsByProviderTypeAndProviderIdAndSlotDate(providerType, providerId, date)) {
                continue;
            }

            // Skip leave days
            if (leaveRepository.existsByProviderIdAndProviderTypeAndLeaveDate(providerId, providerType, date)) {
                continue;
            }

            // Generate slots for the day
            LocalTime cursor = start;
            while (cursor.plusMinutes(SLOT_DURATION_MINUTES).compareTo(end) <= 0) {
                LocalTime slotEnd = cursor.plusMinutes(SLOT_DURATION_MINUTES);
                toSave.add(AvailabilitySlot.builder()
                        .providerType(providerType)
                        .providerId(providerId)
                        .slotDate(date)
                        .startTime(cursor)
                        .endTime(slotEnd)
                        .isAvailable(true)
                        .createdAt(LocalDateTime.now())
                        .updatedAt(LocalDateTime.now())
                        .build());
                cursor = slotEnd;
            }
        }

        if (!toSave.isEmpty()) {
            slotRepository.saveAll(toSave);
        }
    }

    // ─── Query ────────────────────────────────────────────────────────────────

    /**
     * Returns slots for a specific provider on a specific date.
     * Triggers generation first if needed. Past time slots on today are marked unavailable.
     */
    @Transactional
    public List<SlotResponse> getSlotsForDate(ProviderType providerType, Long providerId, LocalDate date) {
        // Reject past dates
        if (date.isBefore(LocalDate.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot query slots for past dates");
        }

        // Lazy generate slots if not already created for this date
        if (!slotRepository.existsByProviderTypeAndProviderIdAndSlotDate(providerType, providerId, date)) {
            // Check leave
            if (leaveRepository.existsByProviderIdAndProviderTypeAndLeaveDate(providerId, providerType, date)) {
                return List.of(); // Provider is on leave — no slots
            }
            generateSlotsForDate(providerType, providerId, date);
        }

        LocalTime now = LocalTime.now();
        boolean isToday = date.equals(LocalDate.now());

        return slotRepository
                .findByProviderTypeAndProviderIdAndSlotDateOrderByStartTime(providerType, providerId, date)
                .stream()
                .map(slot -> SlotResponse.builder()
                        .id(slot.getId())
                        .startTime(slot.getStartTime().format(TIME_FMT))
                        .endTime(slot.getEndTime().format(TIME_FMT))
                        // Mark past time slots on today as unavailable
                        .available(slot.isAvailable() && !(isToday && slot.getStartTime().isBefore(now)))
                        .build())
                .collect(Collectors.toList());
    }

    // ─── Slot Reservation (Atomic / Race-condition-safe) ──────────────────────

    /**
     * Reserves a slot by setting isAvailable = false.
     * Uses a pessimistic write lock so concurrent transactions are serialized.
     * Throws 409 if already taken.
     */
    @Transactional
    public AvailabilitySlot reserveSlot(Long slotId) {
        AvailabilitySlot slot = slotRepository.findByIdWithLock(slotId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Slot not found: " + slotId));

        // Re-validate past dates inside the lock
        if (slot.getSlotDate().isBefore(LocalDate.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Cannot book a slot on a past date");
        }
        if (slot.getSlotDate().equals(LocalDate.now()) && slot.getStartTime().isBefore(LocalTime.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Cannot book a slot in the past");
        }

        if (!slot.isAvailable()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Selected slot is no longer available. Please choose another time.");
        }

        slot.setAvailable(false);
        slot.setUpdatedAt(LocalDateTime.now());
        return slotRepository.save(slot);
    }

    /**
     * Releases a slot back to available = true (used on cancel or reject).
     * No-op if slotId is null (backward-compatible with legacy appointments without slots).
     */
    @Transactional
    public void releaseSlot(Long slotId) {
        if (slotId == null) return;
        slotRepository.findById(slotId).ifPresent(slot -> {
            slot.setAvailable(true);
            slot.setUpdatedAt(LocalDateTime.now());
            slotRepository.save(slot);
        });
    }

    // ─── Manual Slot Control (Provider Dashboard) ─────────────────────────────

    @Transactional
    public void disableSlot(Long slotId, Long requestingProviderId) {
        AvailabilitySlot slot = slotRepository.findById(slotId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Slot not found"));
        validateProviderOwnsSlot(slot, requestingProviderId);
        slot.setAvailable(false);
        slot.setUpdatedAt(LocalDateTime.now());
        slotRepository.save(slot);
    }

    @Transactional
    public void enableSlot(Long slotId, Long requestingProviderId) {
        AvailabilitySlot slot = slotRepository.findById(slotId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Slot not found"));
        validateProviderOwnsSlot(slot, requestingProviderId);
        // Don't re-enable if the slot date/time is already past
        if (slot.getSlotDate().isBefore(LocalDate.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot enable a past slot");
        }
        slot.setAvailable(true);
        slot.setUpdatedAt(LocalDateTime.now());
        slotRepository.save(slot);
    }

    // ─── Leave Management ─────────────────────────────────────────────────────

    @Transactional
    public ProviderLeave markLeave(LeaveRequest req) {
        if (req.getLeaveDate().isBefore(LocalDate.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot mark leave for a past date");
        }
        if (leaveRepository.existsByProviderIdAndProviderTypeAndLeaveDate(
                req.getProviderId(), req.getProviderType(), req.getLeaveDate())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Leave already marked for this date");
        }

        // Disable all slots for that date
        List<AvailabilitySlot> slots = slotRepository
                .findByProviderTypeAndProviderIdAndSlotDateOrderByStartTime(
                        req.getProviderType(), req.getProviderId(), req.getLeaveDate());
        slots.forEach(s -> {
            s.setAvailable(false);
            s.setUpdatedAt(LocalDateTime.now());
        });
        slotRepository.saveAll(slots);

        return leaveRepository.save(ProviderLeave.builder()
                .providerId(req.getProviderId())
                .providerType(req.getProviderType())
                .leaveDate(req.getLeaveDate())
                .reason(req.getReason())
                .createdAt(LocalDateTime.now())
                .build());
    }

    @Transactional
    public void removeLeave(Long leaveId) {
        ProviderLeave leave = leaveRepository.findById(leaveId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Leave record not found"));

        leaveRepository.delete(leave);

        // Re-enable slots for that date if it's in the future
        LocalDate leaveDate = leave.getLeaveDate();
        if (!leaveDate.isBefore(LocalDate.now())) {
            List<AvailabilitySlot> slots = slotRepository
                    .findByProviderTypeAndProviderIdAndSlotDateOrderByStartTime(
                            leave.getProviderType(), leave.getProviderId(), leaveDate);
            if (!slots.isEmpty()) {
                slots.forEach(s -> {
                    s.setAvailable(true);
                    s.setUpdatedAt(LocalDateTime.now());
                });
                slotRepository.saveAll(slots);
            } else {
                generateSlotsForDate(leave.getProviderType(), leave.getProviderId(), leaveDate);
            }
        }
    }

    @Transactional
    public ProviderLeave updateLeave(Long leaveId, LeaveRequest req) {
        ProviderLeave leave = leaveRepository.findById(leaveId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Leave record not found"));

        LocalDate oldDate = leave.getLeaveDate();
        LocalDate newDate = req.getLeaveDate();

        if (newDate.isBefore(LocalDate.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot mark leave for a past date");
        }

        // If date has changed, check duplicate leave on new date
        if (!oldDate.equals(newDate)) {
            if (leaveRepository.existsByProviderIdAndProviderTypeAndLeaveDate(
                    leave.getProviderId(), leave.getProviderType(), newDate)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Leave already marked for the new date");
            }

            // Re-enable slots for the old date
            if (!oldDate.isBefore(LocalDate.now())) {
                List<AvailabilitySlot> oldSlots = slotRepository
                        .findByProviderTypeAndProviderIdAndSlotDateOrderByStartTime(
                                leave.getProviderType(), leave.getProviderId(), oldDate);
                if (!oldSlots.isEmpty()) {
                    oldSlots.forEach(s -> {
                        s.setAvailable(true);
                        s.setUpdatedAt(LocalDateTime.now());
                    });
                    slotRepository.saveAll(oldSlots);
                } else {
                    generateSlotsForDate(leave.getProviderType(), leave.getProviderId(), oldDate);
                }
            }

            // Disable all slots for the new date
            List<AvailabilitySlot> newSlots = slotRepository
                    .findByProviderTypeAndProviderIdAndSlotDateOrderByStartTime(
                            leave.getProviderType(), leave.getProviderId(), newDate);
            if (!newSlots.isEmpty()) {
                newSlots.forEach(s -> {
                    s.setAvailable(false);
                    s.setUpdatedAt(LocalDateTime.now());
                });
                slotRepository.saveAll(newSlots);
            } else {
                generateSlotsForDate(leave.getProviderType(), leave.getProviderId(), newDate);
                List<AvailabilitySlot> createdSlots = slotRepository
                        .findByProviderTypeAndProviderIdAndSlotDateOrderByStartTime(
                                leave.getProviderType(), leave.getProviderId(), newDate);
                createdSlots.forEach(s -> {
                    s.setAvailable(false);
                    s.setUpdatedAt(LocalDateTime.now());
                });
                slotRepository.saveAll(createdSlots);
            }
        }

        leave.setLeaveDate(newDate);
        leave.setReason(req.getReason());
        return leaveRepository.save(leave);
    }


    public List<ProviderLeave> getLeaves(Long providerId, ProviderType providerType) {
        return leaveRepository.findByProviderIdAndProviderTypeOrderByLeaveDateAsc(providerId, providerType);
    }

    // ─── Slot Range Query (for Provider Dashboard) ────────────────────────────

    public List<SlotResponse> getSlotsForDateRange(ProviderType providerType, Long providerId,
                                                    LocalDate from, LocalDate to) {
        generateSlotsIfNeeded(providerType, providerId);
        LocalTime now = LocalTime.now();
        boolean fromIsToday = from.equals(LocalDate.now());

        return slotRepository
                .findByProviderTypeAndProviderIdAndSlotDateBetweenOrderBySlotDateAscStartTimeAsc(
                        providerType, providerId, from, to)
                .stream()
                .map(slot -> SlotResponse.builder()
                        .id(slot.getId())
                        .startTime(slot.getStartTime().format(TIME_FMT))
                        .endTime(slot.getEndTime().format(TIME_FMT))
                        .available(slot.isAvailable() &&
                                !(slot.getSlotDate().equals(LocalDate.now()) && slot.getStartTime().isBefore(now)))
                        .build())
                .collect(Collectors.toList());
    }

    // ─── Private Helpers ──────────────────────────────────────────────────────

    private void generateSlotsForDate(ProviderType providerType, Long providerId, LocalDate date) {
        LocalTime start = providerType == ProviderType.THERAPIST ? THERAPIST_START : HOSPITAL_START;
        LocalTime end   = providerType == ProviderType.THERAPIST ? THERAPIST_END   : HOSPITAL_END;

        List<AvailabilitySlot> toSave = new ArrayList<>();
        LocalTime cursor = start;
        while (cursor.plusMinutes(SLOT_DURATION_MINUTES).compareTo(end) <= 0) {
            LocalTime slotEnd = cursor.plusMinutes(SLOT_DURATION_MINUTES);
            if (!slotRepository.existsByProviderTypeAndProviderIdAndSlotDateAndStartTime(
                    providerType, providerId, date, cursor)) {
                toSave.add(AvailabilitySlot.builder()
                        .providerType(providerType)
                        .providerId(providerId)
                        .slotDate(date)
                        .startTime(cursor)
                        .endTime(slotEnd)
                        .isAvailable(true)
                        .createdAt(LocalDateTime.now())
                        .updatedAt(LocalDateTime.now())
                        .build());
            }
            cursor = slotEnd;
        }
        if (!toSave.isEmpty()) {
            slotRepository.saveAll(toSave);
        }
    }

    private void validateProviderOwnsSlot(AvailabilitySlot slot, Long requestingProviderId) {
        if (!slot.getProviderId().equals(requestingProviderId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "You do not have permission to modify this slot");
        }
    }
}
