package com.hadkarmeals.service.sms;

public interface SmsProvider {
    boolean sendSms(String phoneNumber, String message);
    String getProviderName();
}
