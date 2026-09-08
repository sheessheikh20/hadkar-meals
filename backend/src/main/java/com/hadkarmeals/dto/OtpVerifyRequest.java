package com.hadkarmeals.dto;

import lombok.Data;

@Data
public class OtpVerifyRequest {
    private String email;
    private String otp;
}
