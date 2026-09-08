package com.hadkarmeals.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GoogleAuthRequest {
    @NotBlank(message = "Google ID token is required")
    private String idToken;
}
