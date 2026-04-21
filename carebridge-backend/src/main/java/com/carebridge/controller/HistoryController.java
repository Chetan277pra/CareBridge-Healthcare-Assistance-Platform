package com.carebridge.controller;

import com.carebridge.entity.PredictionHistory;
import com.carebridge.service.PredictionHistoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/history")
@RequiredArgsConstructor
public class HistoryController {

    private final PredictionHistoryService service;

    @GetMapping("/{userId}")
    public List<PredictionHistory> getHistory(@PathVariable Long userId) {
        return service.getUserHistory(userId);
    }
    @GetMapping("/latest/{userId}")
    public PredictionHistory getLatest(@PathVariable
         Long userId) {
        return service.getLatest(userId);
    }
}