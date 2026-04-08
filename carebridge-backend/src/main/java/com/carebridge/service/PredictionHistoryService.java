package com.carebridge.service;

import com.carebridge.entity.PredictionHistory;
import com.carebridge.repository.PredictionHistoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PredictionHistoryService {

    private final PredictionHistoryRepository repository;

    public PredictionHistory save(PredictionHistory history) {
        return repository.save(history);
    }
    public PredictionHistory getLatest(Long userId) {
        return repository.findTopByUserIdOrderByIdDesc(userId);
    }
    public List<PredictionHistory> getUserHistory(Long userId) {
        return repository.findByUserId(userId);
    }
}