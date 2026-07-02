package com.carebridge.util;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Utility class for geographical distance calculations using the Haversine formula.
 */
public class DistanceUtils {

    /**
     * Calculates the geographical distance in kilometers between two points
     * on the Earth's surface using the Haversine formula.
     *
     * @param lat1 Latitude of the first point
     * @param lon1 Longitude of the first point
     * @param lat2 Latitude of the second point
     * @param lon2 Longitude of the second point
     * @return Geographical distance in kilometers rounded to 2 decimal places.
     */
    public static double calculateDistanceKm(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);

        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                   Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                   Math.sin(dLon / 2) * Math.sin(dLon / 2);

        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        double distance = 6371 * c; // Earth's radius in kilometers

        return BigDecimal.valueOf(distance)
                .setScale(2, RoundingMode.HALF_UP)
                .doubleValue();
    }

    /**
     * Null-safe wrapper for calculateDistanceKm.
     *
     * @param lat1 Latitude of the first point (can be null)
     * @param lon1 Longitude of the first point (can be null)
     * @param lat2 Latitude of the second point (can be null)
     * @param lon2 Longitude of the second point (can be null)
     * @return Geographical distance in kilometers rounded to 2 decimal places, or null if any coordinate is null.
     */
    public static Double calculateDistanceKm(Double lat1, Double lon1, Double lat2, Double lon2) {
        if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) {
            return null;
        }
        return calculateDistanceKm(lat1.doubleValue(), lon1.doubleValue(), lat2.doubleValue(), lon2.doubleValue());
    }
}
