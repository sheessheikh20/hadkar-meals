package com.hadkarmeals;

import com.hadkarmeals.dto.AdminLoginRequest;
import com.hadkarmeals.dto.SendOtpRequest;
import com.hadkarmeals.dto.SendOtpResponse;
import com.hadkarmeals.dto.VerifyOtpRequest;
import com.hadkarmeals.dto.AuthResponse;
import com.hadkarmeals.entity.Role;
import com.hadkarmeals.exception.BusinessException;
import com.hadkarmeals.service.AuthService;
import com.hadkarmeals.service.OtpService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
public class AuthAndOtpTest {

    @Autowired
    private AuthService authService;

    @Autowired
    private OtpService otpService;

    @Test
    void testSendOtpReturnsWhatsappUrl() {
        String testPhone = "9820000001"; // Seeded student

        SendOtpResponse response = authService.sendOtp(SendOtpRequest.builder().phoneNumber(testPhone).build());
        assertNotNull(response);
        assertFalse(response.isAdmin(), "Regular student must not be detected as admin");
        assertFalse(response.isRequiresPassword(), "Regular student must not require password");
        assertTrue(response.isRegistered(), "Seeded student must be registered");
        // OTP must NOT be in the response — only the WhatsApp URL
        assertNotNull(response.getWhatsappUrl(), "WhatsApp URL must be returned");
        assertTrue(response.getWhatsappUrl().startsWith("https://wa.me/"), "URL must be a wa.me deep link");

        // Dev mode: static OTP "123456" should still verify successfully
        AuthResponse auth = authService.verifyOtp(VerifyOtpRequest.builder()
                .phoneNumber(testPhone)
                .otp("123456")
                .build());

        assertNotNull(auth);
        assertNotNull(auth.getToken());
        assertEquals(testPhone, auth.getPhoneNumber());
        assertEquals(Role.ROLE_STUDENT, auth.getRole());
    }

    @Test
    void testAdminPhoneRequiresPasswordBypassesOtp() {
        String adminPhone = "1234567890";

        // 1. sendOtp for admin phone
        SendOtpResponse response = authService.sendOtp(SendOtpRequest.builder().phoneNumber(adminPhone).build());
        assertNotNull(response);
        assertTrue(response.isAdmin(), "Admin phone must have isAdmin=true");
        assertTrue(response.isRequiresPassword(), "Admin phone must require password");
        assertTrue(response.isRegistered(), "Admin phone must be registered");
        assertNull(response.getWhatsappUrl(), "Admin must NOT receive WhatsApp OTP URL");

        // 2. Admin logs in with password "HadkarMeals"
        AuthResponse auth = authService.adminLogin(AdminLoginRequest.builder()
                .email(adminPhone)
                .password("HadkarMeals")
                .build());

        assertNotNull(auth);
        assertNotNull(auth.getToken());
        assertEquals(Role.ROLE_ADMIN, auth.getRole());
        assertEquals(adminPhone, auth.getPhoneNumber());
    }

    @Test
    void testInvalidOtpFails() {
        String testPhone = "9820000002";
        authService.sendOtp(SendOtpRequest.builder().phoneNumber(testPhone).build());

        assertThrows(BusinessException.class, () -> {
            authService.verifyOtp(VerifyOtpRequest.builder()
                    .phoneNumber(testPhone)
                    .otp("000000")
                    .build());
        });
    }

    @Test
    void testWhatsappUrlContainsExpectedMessage() {
        String testPhone = "9820000003";
        SendOtpResponse response = authService.sendOtp(SendOtpRequest.builder().phoneNumber(testPhone).build());

        // URL should contain "HadkarMeals+OTP" (URL-encoded)
        assertTrue(
            response.getWhatsappUrl().contains("HadkarMeals") || response.getWhatsappUrl().contains("OTP"),
            "WhatsApp URL should contain HadkarMeals OTP message"
        );
    }
}
