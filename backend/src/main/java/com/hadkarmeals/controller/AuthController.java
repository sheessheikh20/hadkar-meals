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

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@Tag(name = "Authentication", description = "Phone number, password and Google OAuth authentication")
public class AuthController {

    private final AuthService authService;
    private final StudentService studentService;

    public AuthController(AuthService authService, StudentService studentService) {
        this.authService = authService;
        this.studentService = studentService;
    }

    @PostMapping("/firebase")
    @Operation(summary = "Sign in or register via Firebase (Google, Email/Password, Phone — any provider)")
    public ResponseEntity<AuthResponse> firebaseLogin(@Valid @RequestBody GoogleAuthRequest request) {
        return ResponseEntity.ok(authService.googleLogin(request));
    }

    @PostMapping("/send-otp")
    @Operation(summary = "Send OTP to email for verification")
    public ResponseEntity<?> sendOtp(@RequestBody OtpRequest request) {
        authService.generateAndSendOtp(request.getEmail());
        return ResponseEntity.ok(Map.of("message", "OTP sent successfully"));
    }

    @PostMapping("/verify-otp")
    @Operation(summary = "Verify OTP sent to email")
    public ResponseEntity<?> verifyOtp(@RequestBody OtpVerifyRequest request) {
        authService.verifyOtp(request.getEmail(), request.getOtp());
        return ResponseEntity.ok(Map.of("message", "OTP verified successfully"));
    }

    @PostMapping("/complete-profile")
    @Operation(summary = "Complete profile after Google sign-in (name, phone, hostel)")
    public ResponseEntity<AuthResponse> completeProfile(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody CompleteProfileRequest request) {
        return ResponseEntity.ok(authService.completeGoogleProfile(userDetails.getUsername(), request));
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

    @PostMapping("/register")
    @Operation(summary = "Register a new customer account directly (no OTP required)")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request));
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
    @Operation(summary = "Complete student registration profile (Name, Hostel)")
    public ResponseEntity<AuthResponse> registerProfile(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody RegisterStudentRequest request) {

        Student student = studentService.registerStudentProfile(userDetails.getUsername(), request);
        return ResponseEntity.ok(authService.getCurrentUserInfo(userDetails.getUsername()));
    }

    @PostMapping("/reset-client-password")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Super Admin reset client password")
    public ResponseEntity<java.util.Map<String, String>> resetClientPassword(@RequestBody java.util.Map<String, String> body) {
        String email = body.get("email");
        String newPassword = body.get("newPassword");
        authService.resetClientPassword(email, newPassword);
        return ResponseEntity.ok(java.util.Map.of("message", "Password reset successfully for " + email));
    }
}
