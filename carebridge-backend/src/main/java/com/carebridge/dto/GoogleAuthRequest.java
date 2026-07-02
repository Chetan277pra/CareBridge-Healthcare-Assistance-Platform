package com.carebridge.dto;

import com.carebridge.entity.UserRole;
import lombok.Data;

@Data
public class GoogleAuthRequest {
    private String idToken;
    private UserRole role;
}
