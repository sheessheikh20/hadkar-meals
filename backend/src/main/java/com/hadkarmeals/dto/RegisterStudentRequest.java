package com.hadkarmeals.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RegisterStudentRequest {
    @NotBlank(message = "Full name is required")
    private String fullName;

    @NotNull(message = "Service location is required")
    private Long hostelId;
}
