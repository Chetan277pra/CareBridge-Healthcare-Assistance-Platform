package com.carebridge.dto;

import com.carebridge.entity.UserRole;
import lombok.Data;

@Data
public class RegisterRequest {
    private String fullName;
    private String email;
    private String phone;
    private String password;
    private UserRole role;
    private String specialization;
}