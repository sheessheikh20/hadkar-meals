package com.hadkarmeals.service.sms;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component("mockSmsProvider")
public class MockSmsProvider implements SmsProvider {

    private static final Logger log = LoggerFactory.getLogger(MockSmsProvider.class);

    @Override
    public boolean sendSms(String phoneNumber, String message) {
        log.info("[MOCK SMS GATEWAY] >>> Dispatched SMS to: {} | Content: '{}'", phoneNumber, message);
        return true;
    }

    @Override
    public String getProviderName() {
        return "MOCK";
    }
}
