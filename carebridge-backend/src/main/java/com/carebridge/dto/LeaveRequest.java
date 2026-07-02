package com.carebridge.dto;

import com.carebridge.entity.ProviderType;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class LeaveRequest {

    @NotNull(message = "Provider ID is required")
    private Long providerId;

    @NotNull(message = "Provider type is required")
    private ProviderType providerType;

    @NotNull(message = "Leave date is required")
    private LocalDate leaveDate;

    private String reason;
}
