package com.carebridge.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SlotResponse {
    private Long id;
    private String startTime;   // "HH:mm"
    private String endTime;     // "HH:mm"
    private boolean available;
}
