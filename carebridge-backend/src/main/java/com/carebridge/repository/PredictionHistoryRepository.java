package com.carebridge.repository;

import com.carebridge.entity.PredictionHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PredictionHistoryRepository extends JpaRepository<PredictionHistory, Long> {
    List<PredictionHistory> findByUserId(Long userId);
    PredictionHistory findTopByUserIdOrderByIdDesc(Long userId);
}