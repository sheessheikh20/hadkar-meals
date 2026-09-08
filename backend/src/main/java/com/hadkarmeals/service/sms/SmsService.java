package com.hadkarmeals.service.sms;

import com.hadkarmeals.exception.BusinessException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class SmsService {

    private static final Logger log = LoggerFactory.getLogger(SmsService.class);

    @Value("${hadkar.sms.provider:mock}")
    private String providerConfig;

    private final Map<String, SmsProvider> providers;

    public SmsService(Map<String, SmsProvider> providers) {
        this.providers = providers;
    }

    public boolean sendSms(String phoneNumber, String message) {
        String cleanPhone = phoneNumber.replaceAll("[^0-9]", "");
        if (cleanPhone.length() < 10) {
            throw new BusinessException("Invalid phone number format: " + phoneNumber);
        }

        SmsProvider activeProvider;
        if ("production".equalsIgnoreCase(providerConfig) || "real".equalsIgnoreCase(providerConfig) || "http".equalsIgnoreCase(providerConfig)) {
            activeProvider = providers.get("productionHttpSmsProvider");
        } else {
            activeProvider = providers.getOrDefault("mockSmsProvider", providers.values().iterator().next());
        }

        log.info("[SMS SERVICE] Dispatching SMS via provider: {} to: {}", activeProvider.getProviderName(), cleanPhone);
        boolean success = activeProvider.sendSms(cleanPhone, message);

        if (!success && !"MOCK".equalsIgnoreCase(activeProvider.getProviderName())) {
            log.error("[SMS SERVICE FAILED] SMS delivery failed to {} via {}", cleanPhone, activeProvider.getProviderName());
            throw new BusinessException("Failed to deliver SMS OTP to " + cleanPhone + ". Please verify phone number or try again later.");
        }

        return success;
    }

    public boolean sendOtpSms(String phoneNumber, String otp) {
        String message = String.format("Your Hadkar Meals login OTP is %s. Valid for 5 minutes. Do not share this OTP with anyone.", otp);
        return sendSms(phoneNumber, message);
    }
}
