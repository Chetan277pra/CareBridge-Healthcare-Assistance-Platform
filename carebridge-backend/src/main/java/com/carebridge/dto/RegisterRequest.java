package com.carebridge.dto;

import com.carebridge.entity.UserRole;
import lombok.Data;

import java.util.List;

@Data
public class RegisterRequest {
    private String fullName;
    private String email;
    private String phone;
    private String password;
    private UserRole role;
    private List<String> specializations;
    private String location;
    private Double latitude;
    private Double longitude;
    private Long affiliatedHospitalId;
    private Boolean freelancing;
}