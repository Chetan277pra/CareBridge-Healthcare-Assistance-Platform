package com.carebridge.carebridge_backend;

import com.carebridge.dto.LeaveRequest;
import com.carebridge.dto.SlotResponse;
import com.carebridge.entity.AvailabilitySlot;
import com.carebridge.entity.ProviderLeave;
import com.carebridge.entity.ProviderType;
import com.carebridge.repository.AvailabilitySlotRepository;
import com.carebridge.repository.ProviderLeaveRepository;
import com.carebridge.service.AvailabilityService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class AvailabilityServiceTests {

    @Mock
    private AvailabilitySlotRepository slotRepository;

    @Mock
    private ProviderLeaveRepository leaveRepository;

    @InjectMocks
    private AvailabilityService availabilityService;

    private ProviderLeave leaveRecord;

    @BeforeEach
    public void setup() {
        leaveRecord = ProviderLeave.builder()
                .id(1L)
                .providerId(10L)
                .providerType(ProviderType.THERAPIST)
                .leaveDate(LocalDate.now().plusDays(2))
                .reason("Doctor on leave")
                .build();
    }

    @Test
    public void testRemoveLeave_Success_ReEnablesSlots() {
        when(leaveRepository.findById(1L)).thenReturn(Optional.of(leaveRecord));

        AvailabilitySlot slot1 = AvailabilitySlot.builder()
                .id(201L)
                .providerType(ProviderType.THERAPIST)
                .providerId(10L)
                .slotDate(leaveRecord.getLeaveDate())
                .startTime(LocalTime.of(9, 0))
                .endTime(LocalTime.of(9, 30))
                .isAvailable(false)
                .build();

        List<AvailabilitySlot> slots = List.of(slot1);
        when(slotRepository.findByProviderTypeAndProviderIdAndSlotDateOrderByStartTime(
                ProviderType.THERAPIST, 10L, leaveRecord.getLeaveDate())).thenReturn(slots);

        availabilityService.removeLeave(1L);

        verify(leaveRepository, times(1)).delete(leaveRecord);
        verify(slotRepository, times(1)).saveAll(slots);
        assertTrue(slot1.isAvailable());
    }

    @Test
    public void testUpdateLeave_Success_ChangeDate() {
        when(leaveRepository.findById(1L)).thenReturn(Optional.of(leaveRecord));

        LeaveRequest req = new LeaveRequest();
        req.setProviderId(10L);
        req.setProviderType(ProviderType.THERAPIST);
        req.setLeaveDate(LocalDate.now().plusDays(3)); // new date
        req.setReason("Updated reason");

        // Old date: plusDays(2) slots
        AvailabilitySlot oldSlot = AvailabilitySlot.builder()
                .id(201L)
                .providerType(ProviderType.THERAPIST)
                .providerId(10L)
                .slotDate(leaveRecord.getLeaveDate())
                .isAvailable(false)
                .build();

        // New date: plusDays(3) slots
        AvailabilitySlot newSlot = AvailabilitySlot.builder()
                .id(202L)
                .providerType(ProviderType.THERAPIST)
                .providerId(10L)
                .slotDate(req.getLeaveDate())
                .isAvailable(true)
                .build();

        when(leaveRepository.existsByProviderIdAndProviderTypeAndLeaveDate(10L, ProviderType.THERAPIST, req.getLeaveDate()))
                .thenReturn(false);

        when(slotRepository.findByProviderTypeAndProviderIdAndSlotDateOrderByStartTime(
                ProviderType.THERAPIST, 10L, leaveRecord.getLeaveDate())).thenReturn(List.of(oldSlot));

        when(slotRepository.findByProviderTypeAndProviderIdAndSlotDateOrderByStartTime(
                ProviderType.THERAPIST, 10L, req.getLeaveDate())).thenReturn(List.of(newSlot));

        when(leaveRepository.save(any(ProviderLeave.class))).thenReturn(leaveRecord);

        ProviderLeave updated = availabilityService.updateLeave(1L, req);

        assertNotNull(updated);
        verify(slotRepository, times(2)).saveAll(anyList());
        assertTrue(oldSlot.isAvailable());   // old slot re-enabled
        assertFalse(newSlot.isAvailable());  // new slot disabled
    }

    @Test
    public void testUpdateLeave_PastDate_ThrowsException() {
        when(leaveRepository.findById(1L)).thenReturn(Optional.of(leaveRecord));

        LeaveRequest req = new LeaveRequest();
        req.setProviderId(10L);
        req.setProviderType(ProviderType.THERAPIST);
        req.setLeaveDate(LocalDate.now().minusDays(1)); // past date
        req.setReason("Past update");

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> {
            availabilityService.updateLeave(1L, req);
        });

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
    }

    @Test
    public void testUpdateLeave_DuplicateDate_ThrowsConflict() {
        when(leaveRepository.findById(1L)).thenReturn(Optional.of(leaveRecord));

        LeaveRequest req = new LeaveRequest();
        req.setProviderId(10L);
        req.setProviderType(ProviderType.THERAPIST);
        req.setLeaveDate(LocalDate.now().plusDays(4)); // new date
        req.setReason("Conflicting date");

        when(leaveRepository.existsByProviderIdAndProviderTypeAndLeaveDate(10L, ProviderType.THERAPIST, req.getLeaveDate()))
                .thenReturn(true);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> {
            availabilityService.updateLeave(1L, req);
        });

        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
    }
}
