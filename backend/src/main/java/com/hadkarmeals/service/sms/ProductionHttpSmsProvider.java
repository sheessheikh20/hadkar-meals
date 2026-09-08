package com.hadkarmeals.service.sms;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

@Component("productionHttpSmsProvider")
public class ProductionHttpSmsProvider implements SmsProvider {

    private static final Logger log = LoggerFactory.getLogger(ProductionHttpSmsProvider.class);

    @Value("${hadkar.sms.api-key:}")
    private String apiKey;

    @Value("${hadkar.sms.sender-id:HADKAR}")
    private String senderId;

    @Value("${hadkar.sms.endpoint-url:https://api.sms-gateway.com/send}")
    private String endpointUrl;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    @Override
    public boolean sendSms(String phoneNumber, String message) {
        if (apiKey == null || apiKey.trim().isEmpty()) {
            log.error("[PRODUCTION SMS ERROR] SMS API key is not configured. Cannot dispatch real SMS to {}", phoneNumber);
            return false;
        }

        try {
            // Standard JSON payload suitable for modern SMS gateways (MSG91 / Fast2SMS / Twilio webhook)
            String jsonPayload = String.format(
                    "{\"sender\":\"%s\",\"phone\":\"%s\",\"message\":\"%s\",\"apiKey\":\"%s\"}",
                    senderId, phoneNumber, message.replace("\"", "\\\""), apiKey
            );

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(endpointUrl))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + apiKey)
                    .timeout(Duration.ofSeconds(15))
                    .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                log.info("[PRODUCTION SMS SUCCESS] Delivered SMS to {} via {}", phoneNumber, endpointUrl);
                return true;
            } else {
                log.error("[PRODUCTION SMS FAILED] Gateway returned status {} - Body: {}", response.statusCode(), response.body());
                return false;
            }
        } catch (Exception e) {
            log.error("[PRODUCTION SMS EXCEPTION] Failed to dispatch SMS to {}: {}", phoneNumber, e.getMessage());
            return false;
        }
    }

    @Override
    public String getProviderName() {
        return "PRODUCTION_HTTP";
    }
}
