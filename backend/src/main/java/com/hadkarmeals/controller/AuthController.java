package com.hadkarmeals.controller;

import com.hadkarmeals.dto.*;
import com.hadkarmeals.entity.Student;
import com.hadkarmeals.service.AuthService;
import com.hadkarmeals.service.StudentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@Tag(name = "Authentication", description = "Phone number and OTP based passwordless authentication")
public class AuthController {

    private final AuthService authService;
    private final StudentService studentService;

    public AuthController(AuthService authService, StudentService studentService) {
        this.authService = authService;
        this.studentService = studentService;
    }

    @PostMapping("/send-otp")
    @Operation(summary = "Request a 6-digit OTP for phone number")
    public ResponseEntity<SendOtpResponse> sendOtp(@Valid @RequestBody SendOtpRequest request) {
        return ResponseEntity.ok(authService.sendOtp(request));
    }

    @PostMapping("/verify-otp")
    @Operation(summary = "Verify 6-digit OTP and receive JWT token")
    public ResponseEntity<AuthResponse> verifyOtp(@Valid @RequestBody VerifyOtpRequest request) {
        return ResponseEntity.ok(authService.verifyOtp(request));
    }

    @PostMapping("/login")
    @Operation(summary = "Universal login with phone number or email and password")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.loginWithPassword(request));
    }

    @PostMapping("/admin-login")
    @Operation(summary = "Admin login with email and password")
    public ResponseEntity<AuthResponse> adminLogin(@Valid @RequestBody AdminLoginRequest request) {
        return ResponseEntity.ok(authService.adminLogin(request));
    }

    @PostMapping("/register-with-otp")
    @Operation(summary = "Register customer/user profile with verified OTP")
    public ResponseEntity<AuthResponse> registerWithOtp(@Valid @RequestBody RegisterWithOtpRequest request) {
        return ResponseEntity.ok(authService.registerWithOtp(request));
    }

    @GetMapping("/me")
    @Operation(summary = "Get current authenticated user info")
    public ResponseEntity<AuthResponse> getCurrentUser(@AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(authService.getCurrentUserInfo(userDetails.getUsername()));
    }

    @PostMapping("/register-profile")
    @Operation(summary = "Complete student registration profile (Name, Hostel, Room)")
    public ResponseEntity<AuthResponse> registerProfile(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody RegisterStudentRequest request) {

        Student student = studentService.registerStudentProfile(userDetails.getUsername(), request);
        return ResponseEntity.ok(authService.getCurrentUserInfo(userDetails.getUsername()));
    }

    @PostMapping("/reset-client-password")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Super Admin reset client password")
    public ResponseEntity<java.util.Map<String, String>> resetClientPassword(@RequestBody java.util.Map<String, String> body) {
        String email = body.get("email");
        String newPassword = body.get("newPassword");
        authService.resetClientPassword(email, newPassword);
        return ResponseEntity.ok(java.util.Map.of("message", "Password reset successfully for " + email));
    }
}
