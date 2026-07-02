package com.carebridge.carebridge_backend;

import com.carebridge.controller.AppointmentController;
import com.carebridge.dto.AppointmentRequest;
import com.carebridge.dto.AppointmentResponse;
import com.carebridge.entity.*;
import com.carebridge.repository.AppointmentRepository;
import com.carebridge.repository.HospitalRepository;
import com.carebridge.repository.TherapistRepository;
import com.carebridge.repository.UserRepository;
import com.carebridge.service.AvailabilityService;
import com.carebridge.service.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class AppointmentLifecycleTests {

    @Mock
    private AppointmentRepository appointmentRepository;
    @Mock
    private TherapistRepository therapistRepository;
    @Mock
    private HospitalRepository hospitalRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private AvailabilityService availabilityService;
    @Mock
    private NotificationService notificationService;
    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @InjectMocks
    private AppointmentController appointmentController;

    @Mock
    private SecurityContext securityContext;
    @Mock
    private Authentication authentication;
    @Mock
    private UserDetails userDetails;

    private User patientUser;
    private User therapistUser;

    @BeforeEach
    public void setup() {
        SecurityContextHolder.setContext(securityContext);
        
        patientUser = User.builder()
                .id(1)
                .fullName("John Patient")
                .email("patient@carebridge.com")
                .role(UserRole.PATIENT)
                .build();

        therapistUser = User.builder()
                .id(2)
                .fullName("Dr. Sarah Specialist")
                .email("doctor@carebridge.com")
                .role(UserRole.THERAPIST)
                .build();
    }

    private void mockLoggedInUser(User user) {
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(userDetails);
        when(userDetails.getUsername()).thenReturn(user.getEmail());
        when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
    }

    @Test
    public void testBookAppointment_Success() {
        mockLoggedInUser(patientUser);

        AppointmentRequest request = new AppointmentRequest();
        request.setPatientEmail("patient@carebridge.com");
        request.setDisease("Depression");
        request.setAppointmentDate(LocalDate.now().plusDays(1));
        request.setAppointmentTime(LocalTime.of(10, 0));
        request.setReasonForVisit("Anxiety");

        Appointment savedAppointment = Appointment.builder()
                .id(101L)
                .status(AppointmentStatus.PENDING)
                .build();

        when(appointmentRepository.save(any(Appointment.class))).thenReturn(savedAppointment);

        ResponseEntity<AppointmentResponse> response = appointmentController.bookAppointment(request);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(101L, response.getBody().getAppointmentId());
        assertEquals("PENDING", response.getBody().getStatus());
    }

    @Test
    public void testBookAppointment_PastDate_ThrowsException() {
        mockLoggedInUser(patientUser);

        AppointmentRequest request = new AppointmentRequest();
        request.setAppointmentDate(LocalDate.now().minusDays(1));
        request.setAppointmentTime(LocalTime.of(10, 0));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> {
            appointmentController.bookAppointment(request);
        });

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
    }

    @Test
    public void testAcceptAppointment_Success() {
        mockLoggedInUser(therapistUser);

        Appointment appointment = Appointment.builder()
                .id(101L)
                .patientEmail("patient@carebridge.com")
                .therapistEmail("doctor@carebridge.com")
                .status(AppointmentStatus.PENDING)
                .build();

        when(appointmentRepository.findById(101L)).thenReturn(Optional.of(appointment));

        ResponseEntity<Map<String, String>> response = appointmentController.acceptAppointment(101L);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("ACCEPTED", response.getBody().get("status"));
        assertEquals(AppointmentStatus.ACCEPTED, appointment.getStatus());
        assertNotNull(appointment.getApprovedAt());
    }

    @Test
    public void testCancelAppointment_Success() {
        mockLoggedInUser(patientUser);

        Appointment appointment = Appointment.builder()
                .id(101L)
                .patientEmail("patient@carebridge.com")
                .status(AppointmentStatus.PENDING)
                .build();

        when(appointmentRepository.findById(101L)).thenReturn(Optional.of(appointment));

        ResponseEntity<Map<String, String>> response = appointmentController.cancelAppointment(101L);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("CANCELLED", response.getBody().get("status"));
        assertEquals(AppointmentStatus.CANCELLED, appointment.getStatus());
        assertNotNull(appointment.getCancelledAt());
    }

    @Test
    public void testCancelAppointment_ForbiddenForOthers() {
        mockLoggedInUser(therapistUser); // Logged in as doctor, not patient

        Appointment appointment = Appointment.builder()
                .id(101L)
                .patientEmail("patient@carebridge.com")
                .status(AppointmentStatus.PENDING)
                .build();

        when(appointmentRepository.findById(101L)).thenReturn(Optional.of(appointment));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> {
            appointmentController.cancelAppointment(101L);
        });

        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
    }

    @Test
    public void testBookAppointment_WithSlot_Success() {
        mockLoggedInUser(patientUser);

        AppointmentRequest request = new AppointmentRequest();
        request.setPatientEmail("patient@carebridge.com");
        request.setDisease("Depression");
        request.setAppointmentDate(LocalDate.now().plusDays(1));
        request.setAppointmentTime(LocalTime.of(10, 0));
        request.setReasonForVisit("Anxiety");
        request.setSlotId(500L);

        AvailabilitySlot slot = AvailabilitySlot.builder()
                .id(500L)
                .providerType(ProviderType.THERAPIST)
                .providerId(2L)
                .slotDate(LocalDate.now().plusDays(1))
                .startTime(LocalTime.of(10, 30))
                .endTime(LocalTime.of(11, 0))
                .isAvailable(true)
                .build();

        when(availabilityService.reserveSlot(500L)).thenReturn(slot);

        Appointment savedAppointment = Appointment.builder()
                .id(101L)
                .status(AppointmentStatus.PENDING)
                .slotId(500L)
                .appointmentDate(slot.getSlotDate())
                .appointmentTime(slot.getStartTime())
                .build();

        when(appointmentRepository.save(any(Appointment.class))).thenReturn(savedAppointment);

        ResponseEntity<AppointmentResponse> response = appointmentController.bookAppointment(request);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(101L, response.getBody().getAppointmentId());
        verify(availabilityService, times(1)).reserveSlot(500L);
    }

    @Test
    public void testBookAppointment_WithSlot_Unavailable_ThrowsConflict() {
        mockLoggedInUser(patientUser);

        AppointmentRequest request = new AppointmentRequest();
        request.setPatientEmail("patient@carebridge.com");
        request.setAppointmentDate(LocalDate.now().plusDays(1));
        request.setAppointmentTime(LocalTime.of(10, 0));
        request.setReasonForVisit("Anxiety");
        request.setSlotId(500L);

        when(availabilityService.reserveSlot(500L)).thenThrow(
                new ResponseStatusException(HttpStatus.CONFLICT, "Selected slot is no longer available."));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> {
            appointmentController.bookAppointment(request);
        });

        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
        assertEquals("Selected slot is no longer available.", ex.getReason());
        verify(appointmentRepository, never()).save(any(Appointment.class));
    }

    @Test
    public void testRejectAppointment_ReleasesSlot() {
        mockLoggedInUser(therapistUser);

        Appointment appointment = Appointment.builder()
                .id(101L)
                .patientEmail("patient@carebridge.com")
                .therapistEmail("doctor@carebridge.com")
                .status(AppointmentStatus.PENDING)
                .slotId(500L)
                .build();

        when(appointmentRepository.findById(101L)).thenReturn(Optional.of(appointment));

        ResponseEntity<Map<String, String>> response = appointmentController.rejectAppointment(101L);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("REJECTED", response.getBody().get("status"));
        assertEquals(AppointmentStatus.REJECTED, appointment.getStatus());
        verify(availabilityService, times(1)).releaseSlot(500L);
    }

    @Test
    public void testCancelAppointment_ReleasesSlot() {
        mockLoggedInUser(patientUser);

        Appointment appointment = Appointment.builder()
                .id(101L)
                .patientEmail("patient@carebridge.com")
                .status(AppointmentStatus.PENDING)
                .slotId(500L)
                .build();

        when(appointmentRepository.findById(101L)).thenReturn(Optional.of(appointment));

        ResponseEntity<Map<String, String>> response = appointmentController.cancelAppointment(101L);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("CANCELLED", response.getBody().get("status"));
        assertEquals(AppointmentStatus.CANCELLED, appointment.getStatus());
        verify(availabilityService, times(1)).releaseSlot(500L);
    }
}
