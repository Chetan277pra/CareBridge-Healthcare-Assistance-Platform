package com.carebridge.repository;

import com.carebridge.entity.AvailabilitySlot;
import com.carebridge.entity.ProviderType;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

public interface AvailabilitySlotRepository extends JpaRepository<AvailabilitySlot, Long> {

    List<AvailabilitySlot> findByProviderTypeAndProviderIdAndSlotDateOrderByStartTime(
            ProviderType providerType, Long providerId, LocalDate slotDate);

    boolean existsByProviderTypeAndProviderIdAndSlotDateAndStartTime(
            ProviderType providerType, Long providerId, LocalDate slotDate, LocalTime startTime);

    boolean existsByProviderTypeAndProviderIdAndSlotDate(
            ProviderType providerType, Long providerId, LocalDate slotDate);

    List<AvailabilitySlot> findByProviderTypeAndProviderIdAndSlotDateBetweenOrderBySlotDateAscStartTimeAsc(
            ProviderType providerType, Long providerId, LocalDate from, LocalDate to);

    /**
     * Pessimistic write lock — used during slot reservation to prevent race conditions.
     * Blocks concurrent transactions from reading/modifying this slot until the current
     * transaction commits or rolls back.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM AvailabilitySlot s WHERE s.id = :id")
    Optional<AvailabilitySlot> findByIdWithLock(@Param("id") Long id);

    void deleteByProviderTypeAndProviderIdAndSlotDate(
            ProviderType providerType, Long providerId, LocalDate slotDate);
}
