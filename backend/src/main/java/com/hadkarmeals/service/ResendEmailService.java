package com.hadkarmeals.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class ResendEmailService {

    @Value("${resend.api.key:}")
    private String resendApiKey;

    @Value("${resend.sender.email:onboarding@resend.dev}")
    private String senderEmail;

    @Value("${resend.sender.name:Hadkar Meals}")
    private String senderName;

    private final RestTemplate restTemplate = new RestTemplate();

    public void sendOtpEmail(String toEmail, String otp) {
        if (resendApiKey == null || resendApiKey.isEmpty()) {
            System.out.println("=================================================");
            System.out.println("RESEND API KEY MISSING! Simulating email to: " + toEmail);
            System.out.println("YOUR OTP IS: " + otp);
            System.out.println("=================================================");
            return;
        }

        String url = "https://api.resend.com/emails";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(resendApiKey);

        Map<String, Object> body = new HashMap<>();
        body.put("from", senderName + " <" + senderEmail + ">");
        body.put("to", List.of(toEmail));
        body.put("subject", "Your Verification Code - Hadkar Meals");
        body.put("html", "<html><body><h2>Welcome to Hadkar Meals!</h2><p>Your verification code is: <strong>" + otp + "</strong></p><p>This code will expire in 10 minutes.</p></body></html>");

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        try {
            restTemplate.postForEntity(url, entity, String.class);
            System.out.println("OTP sent to " + toEmail + " via Resend.");
        } catch (org.springframework.web.client.HttpStatusCodeException e) {
            System.err.println("Resend API Error: " + e.getResponseBodyAsString());
            throw new RuntimeException("Failed to send verification email: " + e.getResponseBodyAsString());
        } catch (Exception e) {
            System.err.println("Failed to send OTP via Resend: " + e.getMessage());
            throw new RuntimeException("Failed to send verification email. Please try again later.");
        }
    }
}
