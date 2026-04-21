package com.carebridge.repository;

import com.carebridge.entity.Hospital;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface HospitalRepository extends JpaRepository<Hospital, Long> {
    Hospital findTopByOrderByRatingDesc();
    Optional<Hospital> findTopBySpecializationIgnoreCaseOrderByRatingDesc(String specialization);
    Optional<Hospital> findTopBySpecializationContainingIgnoreCaseOrderByRatingDesc(String specialization);
    Optional<Hospital> findByEmail(String email);
}
