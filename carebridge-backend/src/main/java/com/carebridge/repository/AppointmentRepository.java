package com.carebridge.repository;

import com.carebridge.entity.Appointment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AppointmentRepository extends JpaRepository<Appointment, Long> {
    List<Appointment> findByTherapistEmail(String therapistEmail);
    List<Appointment> findByHospitalEmail(String hospitalEmail);
    List<Appointment> findByPatientEmail(String patientEmail);
}
