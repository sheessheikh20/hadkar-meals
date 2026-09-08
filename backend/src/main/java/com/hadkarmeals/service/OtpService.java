package com.hadkarmeals.service;

import com.hadkarmeals.exception.BusinessException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * OTP Service — Manual WhatsApp Delivery Flow
 *
 * Security model:
 *  - OTP is generated server-side using SecureRandom.
 *  - The OTP code is NEVER returned to the frontend in any API response.
 *  - The backend only returns a whatsappUrl with the OTP pre-filled for the user to manually send.
 *  - WhatsApp itself is opened by the user on their device — the website does NOT send any message.
 *  - OTPs expire after 5 minutes and are invalidated after 3 failed attempts.
 *  - In dev mode (devMock=true), a static devCode is used to allow fast development testing,
 *    but it is still never shown in production-style API responses.
 */
@Service
public class OtpService {

    private static final Logger log = LoggerFactory.getLogger(OtpService.class);

    @Value("${hadkar.otp.dev-mock:true}")
    private boolean devMock;

    @Value("${hadkar.otp.dev-code:123456}")
    private String devCode;

    @Value("${hadkar.otp.expiry-minutes:5}")
    private int expiryMinutes;

    @Value("${hadkar.otp.max-attempts:3}")
    private int maxAttempts;

    private static class OtpEntry {
        final String code;
        final LocalDateTime expiresAt;
        LocalDateTime lastSentAt;
        int attempts;

        OtpEntry(String code, LocalDateTime expiresAt) {
            this.code = code;
            this.expiresAt = expiresAt;
            this.lastSentAt = LocalDateTime.now();
            this.attempts = 0;
        }
    }

    private final Map<String, OtpEntry> otpStorage = new ConcurrentHashMap<>();
    private final SecureRandom secureRandom = new SecureRandom();

    /**
     * Generates a new OTP for the given phone number and stores it server-side.
     *
     * @param phoneNumber cleaned (digits-only) phone number
     * @return the raw OTP code — ONLY used internally to build a WhatsApp URL.
     *         This value must NEVER be sent to the frontend directly.
     */
    public String generateAndStoreOtp(String phoneNumber) {
        String cleanPhone = cleanPhoneNumber(phoneNumber);
        OtpEntry existing = otpStorage.get(cleanPhone);

        if (existing != null && existing.lastSentAt.plusSeconds(5).isAfter(LocalDateTime.now())) {
            throw new BusinessException("Please wait a few seconds before requesting another OTP");
        }

        // Always generate a fresh, random 6-digit OTP (100000 to 999999) every time
        String code = String.format("%06d", 100_000 + secureRandom.nextInt(900_000));
        LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(expiryMinutes);
        otpStorage.put(cleanPhone, new OtpEntry(code, expiresAt));

        log.info("[OTP] New dynamic OTP generated and stored for phone: {}***", cleanPhone.substring(0, Math.min(4, cleanPhone.length())));
        // NOTE: the code is returned here ONLY so AuthService can build the WhatsApp URL.
        // It must NOT be placed in any HTTP response body.
        return code;
    }

    /**
     * Verifies the OTP entered by the user.
     *
     * @param phoneNumber cleaned phone number
     * @param inputOtp    the 6-digit code the user typed in
     * @return true if valid, throws BusinessException otherwise
     */
    public boolean verifyOtp(String phoneNumber, String inputOtp) {
        String cleanPhone = cleanPhoneNumber(phoneNumber);

        OtpEntry entry = otpStorage.get(cleanPhone);
        if (entry == null) {
            // Dev bypass: allows static code for developer/test environment if devMock is enabled
            if (devMock && devCode.equals(inputOtp)) {
                log.info("[OTP] Dev-mode bypass accepted for phone: {}***", cleanPhone.substring(0, Math.min(4, cleanPhone.length())));
                return true;
            }
            throw new BusinessException("No active OTP found. Please request a new OTP.");
        }

        if (LocalDateTime.now().isAfter(entry.expiresAt)) {
            otpStorage.remove(cleanPhone);
            throw new BusinessException("OTP has expired. Please request a new OTP.");
        }

        if (entry.attempts >= maxAttempts) {
            otpStorage.remove(cleanPhone);
            throw new BusinessException("Maximum OTP attempts exceeded. Please request a new OTP.");
        }

        entry.attempts++;

        // Verify against the newly generated OTP (or dev bypass if enabled)
        if (!entry.code.equals(inputOtp) && !(devMock && devCode.equals(inputOtp))) {
            int remaining = maxAttempts - entry.attempts;
            throw new BusinessException("Invalid OTP. " + remaining + " attempt(s) remaining.");
        }

        otpStorage.remove(cleanPhone);
        return true;
    }

    private String cleanPhoneNumber(String phone) {
        return phone.replaceAll("[^0-9]", "");
    }
}
