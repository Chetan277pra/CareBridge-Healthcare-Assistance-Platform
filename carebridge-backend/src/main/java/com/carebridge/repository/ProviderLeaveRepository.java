package com.carebridge.repository;

import com.carebridge.entity.ProviderLeave;
import com.carebridge.entity.ProviderType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface ProviderLeaveRepository extends JpaRepository<ProviderLeave, Long> {

    boolean existsByProviderIdAndProviderTypeAndLeaveDate(
            Long providerId, ProviderType providerType, LocalDate leaveDate);

    List<ProviderLeave> findByProviderIdAndProviderTypeOrderByLeaveDateAsc(
            Long providerId, ProviderType providerType);

    void deleteByProviderIdAndProviderTypeAndLeaveDate(
            Long providerId, ProviderType providerType, LocalDate leaveDate);
}
