package com.hadkarmeals.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;

@Service
public class ResendEmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String senderEmail;

    public ResendEmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendOtpEmail(String toEmail, String otp) {
        if (senderEmail == null || senderEmail.isEmpty()) {
            System.out.println("=================================================");
            System.out.println("GMAIL CREDENTIALS MISSING! Simulating email to: " + toEmail);
            System.out.println("YOUR OTP IS: " + otp);
            System.out.println("=================================================");
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            
            helper.setFrom("Hadkar Meals <" + senderEmail + ">");
            helper.setTo(toEmail);
            helper.setSubject("Your Verification Code - Hadkar Meals");
            
            String htmlContent = "<html><body><h2>Welcome to Hadkar Meals!</h2><p>Your verification code is: <strong>" + otp + "</strong></p><p>This code will expire in 10 minutes.</p></body></html>";
            helper.setText(htmlContent, true);
            
            mailSender.send(message);
            System.out.println("OTP sent to " + toEmail + " via Gmail SMTP.");
        } catch (Exception e) {
            System.err.println("Failed to send OTP via Gmail: " + e.getMessage());
            throw new RuntimeException("Failed to send verification email. Please try again later.");
        }
    }
}
