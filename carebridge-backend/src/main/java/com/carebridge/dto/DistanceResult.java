package com.carebridge.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO representing a search/recommendation result with distance information.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DistanceResult {
    private Long id;
    private String name;
    private Double rating;
    private Double distanceKm;
}
