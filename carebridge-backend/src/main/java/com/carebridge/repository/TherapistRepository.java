package com.carebridge.repository;

import com.carebridge.entity.Therapist;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TherapistRepository extends JpaRepository<Therapist, Long> {
    Optional<Therapist> findTopBySpecializationOrderByRatingDesc(String specialization);
    Optional<Therapist> findTopBySpecializationIgnoreCaseOrderByRatingDesc(String specialization);
    Optional<Therapist> findTopBySpecializationContainingIgnoreCaseOrderByRatingDesc(String specialization);
    Optional<Therapist> findByEmail(String email);
    List<Therapist> findBySpecializationContainingIgnoreCase(String specialization);
    List<Therapist> findAllBySpecializationContainingIgnoreCase(String specialization);
}
