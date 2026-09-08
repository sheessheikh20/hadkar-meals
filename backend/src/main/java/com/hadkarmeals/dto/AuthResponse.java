package com.hadkarmeals.dto;

import com.hadkarmeals.entity.Role;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuthResponse {
    private String token;
    private Role role;
    private String phoneNumber;
    private String email;
    private Long userId;
    private Long studentId;
    private String fullName;
    private String hostelName;
    private Boolean active;
    private boolean profileComplete;
}
