package com.hadkarmeals.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SendOtpResponse {
    private String message;
    private String whatsappUrl;
    private int cooldownSeconds;

    @JsonProperty("registered")
    private boolean isRegistered;

    @JsonProperty("isAdmin")
    private boolean isAdmin;

    @JsonProperty("requiresPassword")
    private boolean requiresPassword;
}
