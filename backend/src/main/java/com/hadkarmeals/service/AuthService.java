package com.hadkarmeals.service;

import com.hadkarmeals.dto.*;
import com.hadkarmeals.entity.Hostel;
import com.hadkarmeals.entity.Role;
import com.hadkarmeals.entity.Student;
import com.hadkarmeals.entity.User;
import com.hadkarmeals.exception.BusinessException;
import com.hadkarmeals.exception.ResourceNotFoundException;
import com.hadkarmeals.repository.HostelRepository;
import com.hadkarmeals.repository.StudentRepository;
import com.hadkarmeals.repository.UserRepository;
import com.hadkarmeals.security.JwtTokenProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final StudentRepository studentRepository;
    private final OtpService otpService;
    private final JwtTokenProvider tokenProvider;
    private final StudentService studentService;
    private final AuditLogService auditLogService;

    private final HostelRepository hostelRepository;

    public AuthService(
            UserRepository userRepository,
            StudentRepository studentRepository,
            HostelRepository hostelRepository,
            OtpService otpService,
            JwtTokenProvider tokenProvider,
            StudentService studentService,
            AuditLogService auditLogService) {
        this.userRepository = userRepository;
        this.studentRepository = studentRepository;
        this.hostelRepository = hostelRepository;
        this.otpService = otpService;
        this.tokenProvider = tokenProvider;
        this.studentService = studentService;
        this.auditLogService = auditLogService;
    }

    public SendOtpResponse sendOtp(SendOtpRequest request) {
        String phone = cleanPhoneNumber(request.getPhoneNumber());
        Optional<User> userOpt = userRepository.findByPhoneNumber(phone);
        if (userOpt.isEmpty()) {
            String altPhone = phone.startsWith("0") ? phone.substring(1) : "0" + phone;
            userOpt = userRepository.findByPhoneNumber(altPhone);
        }
        boolean isRegistered = userOpt.isPresent();

        boolean isAdmin = userOpt.isPresent() &&
                (userOpt.get().getRole() == Role.ROLE_ADMIN || userOpt.get().getRole() == Role.ROLE_SUPER_ADMIN);

        // Reject fake/invalid mobile numbers for non-admin accounts
        if (!isAdmin && !isValidIndianMobileNumber(phone)) {
            throw new BusinessException("Invalid mobile number. Please enter an authentic 10-digit Indian mobile number starting with 6, 7, 8, or 9.");
        }

        // If admin/staff, they authenticate using their secure password rather than OTP
        if (isAdmin) {
            return SendOtpResponse.builder()
                    .message("Admin account detected. Please enter your password.")
                    .whatsappUrl(null)
                    .cooldownSeconds(0)
                    .isRegistered(true)
                    .isAdmin(true)
                    .requiresPassword(true)
                    .build();
        }

        // Generate and store OTP server-side. The raw code is ONLY used to build the
        // WhatsApp URL here — it is never sent back in the API response body.
        String otpCode = otpService.generateAndStoreOtp(phone);

        // Build a wa.me deep link that pre-fills the message to the user's OWN number.
        // The +91 prefix is added for Indian numbers. The user must manually press "Send" inside WhatsApp.
        String cleanForWa = phone.startsWith("91") ? phone : "91" + phone;
        String waMessage = "HadkarMeals OTP: " + otpCode;
        String whatsappUrl = "https://wa.me/" + cleanForWa + "?text=" + java.net.URLEncoder.encode(waMessage, java.nio.charset.StandardCharsets.UTF_8);

        return SendOtpResponse.builder()
                .message("Please send the pre-filled message via WhatsApp to verify your number.")
                .whatsappUrl(whatsappUrl)
                .cooldownSeconds(5)
                .isRegistered(isRegistered)
                .isAdmin(false)
                .requiresPassword(false)
                .build();
    }


    @Transactional
    public AuthResponse registerWithOtp(RegisterWithOtpRequest request) {
        String phone = cleanPhoneNumber(request.getPhoneNumber());
        if (!isValidIndianMobileNumber(phone)) {
            throw new BusinessException("Invalid mobile number. Please enter an authentic 10-digit Indian mobile number starting with 6, 7, 8, or 9.");
        }

        // 1. Check if already registered - Strict prevention of duplicate accounts
        if (userRepository.existsByPhoneNumber(phone)) {
            throw new BusinessException("This mobile number is already registered. Please go to Login.");
        }

        // 2. Verify OTP first! (Unverified numbers are never registered)
        boolean verified = otpService.verifyOtp(phone, request.getOtp());
        if (!verified) {
            throw new BusinessException("Invalid or expired OTP. Please enter the correct OTP.");
        }

        // 3. Find Delivery Location
        Hostel hostel = hostelRepository.findById(request.getHostelId())
                .orElseThrow(() -> new ResourceNotFoundException("Selected delivery location not found"));

        // 4. Create User
        User user = User.builder()
                .phoneNumber(phone)
                .email(request.getEmail() != null && !request.getEmail().trim().isEmpty() ? request.getEmail().trim() : null)
                .password(request.getPassword() != null && !request.getPassword().trim().isEmpty() ? request.getPassword().trim() : null)
                .role(Role.ROLE_STUDENT)
                .active(true)
                .build();
        user = userRepository.save(user);

        // 5. Create Student / Customer Profile
        Student student = Student.builder()
                .user(user)
                .fullName(request.getFullName().trim())
                .phoneNumber(phone)
                .email(user.getEmail())
                .hostel(hostel)
                .active(true)
                .build();
        student = studentRepository.save(student);

        String token = tokenProvider.generateToken(user.getPhoneNumber(), user.getRole(), user.getId(), student.getId());

        auditLogService.log(
                "USER_REGISTERED",
                phone,
                "User",
                String.valueOf(user.getId()),
                "Registered new customer: " + student.getFullName() + " at " + hostel.getName()
        );

        return AuthResponse.builder()
                .token(token)
                .role(user.getRole())
                .phoneNumber(user.getPhoneNumber())
                .email(user.getEmail())
                .userId(user.getId())
                .studentId(student.getId())
                .fullName(student.getFullName())
                .hostelName(hostel.getName())
                .active(user.getActive())
                .profileComplete(true)
                .build();
    }

    public AuthResponse loginWithPassword(LoginRequest request) {
        String identifier = request.getIdentifier().trim();
        String cleaned = cleanPhoneNumber(identifier);
        String altPhone = cleaned.startsWith("0") ? cleaned.substring(1) : "0" + cleaned;

        User user = userRepository.findByEmail(identifier.toLowerCase())
                .or(() -> userRepository.findByPhoneNumber(cleaned))
                .or(() -> userRepository.findByPhoneNumber(altPhone))
                .orElseThrow(() -> new BusinessException("Account not found for " + request.getIdentifier() + ". Please sign up first!"));

        if (user.getPassword() == null || !user.getPassword().equals(request.getPassword().trim())) {
            auditLogService.log("LOGIN_FAILED", user.getPhoneNumber(), "User",
                    String.valueOf(user.getId()), "Failed password login attempt");
            throw new BusinessException("Invalid password. Please enter the correct password.");
        }

        Optional<Student> studentOpt = studentRepository.findByUserId(user.getId());
        Long studentId = studentOpt.map(Student::getId).orElse(null);
        String fullName = studentOpt.map(Student::getFullName).orElse(
                user.getRole() == Role.ROLE_SUPER_ADMIN ? "Super Admin (Developer)" :
                user.getRole() == Role.ROLE_ADMIN ? "Hadkar Meals Admin" : "Customer"
        );
        String hostelName = studentOpt.map(s -> s.getHostel() != null ? s.getHostel().getName() : null).orElse(null);
        boolean profileComplete = studentOpt.isPresent() && studentOpt.get().getHostel() != null;

        String token = tokenProvider.generateToken(user.getPhoneNumber(), user.getRole(), user.getId(), studentId);

        auditLogService.log(
                "USER_PASSWORD_LOGIN",
                user.getPhoneNumber(),
                "User",
                String.valueOf(user.getId()),
                "User logged in with password as role: " + user.getRole()
        );

        return AuthResponse.builder()
                .token(token)
                .role(user.getRole())
                .phoneNumber(user.getPhoneNumber())
                .email(user.getEmail())
                .userId(user.getId())
                .studentId(studentId)
                .fullName(fullName)
                .hostelName(hostelName)
                .active(user.getActive())
                .profileComplete(profileComplete)
                .build();
    }

    public AuthResponse adminLogin(AdminLoginRequest request) {
        String identifier = request.getEmail().trim().toLowerCase();
        String cleaned = cleanPhoneNumber(identifier);
        String altPhone = cleaned.startsWith("0") ? cleaned.substring(1) : "0" + cleaned;

        User user = userRepository.findByEmail(identifier)
                .or(() -> userRepository.findByPhoneNumber(cleaned))
                .or(() -> userRepository.findByPhoneNumber(altPhone))
                .orElseThrow(() -> new BusinessException("Invalid admin credentials. Account not found."));

        if (user.getRole() != Role.ROLE_ADMIN && user.getRole() != Role.ROLE_SUPER_ADMIN) {
            throw new BusinessException("Access denied. You do not have administrator privileges.");
        }

        // Verify password — only accept the exact stored password, no backdoors
        if (user.getPassword() == null || !user.getPassword().equals(request.getPassword())) {
            auditLogService.log("ADMIN_LOGIN_FAILED", user.getPhoneNumber(), "User",
                    String.valueOf(user.getId()), "Failed admin login attempt");
            throw new BusinessException("Invalid admin password. Please try again.");
        }

        String token = tokenProvider.generateToken(user.getPhoneNumber(), user.getRole(), user.getId(), null);

        auditLogService.log(
                "ADMIN_LOGIN",
                user.getPhoneNumber(),
                "User",
                String.valueOf(user.getId()),
                "Admin logged in successfully as: " + user.getRole()
        );

        return AuthResponse.builder()
                .token(token)
                .role(user.getRole())
                .phoneNumber(user.getPhoneNumber())
                .email(user.getEmail())
                .userId(user.getId())
                .fullName(user.getRole() == Role.ROLE_SUPER_ADMIN ? "Super Admin (Developer)" : "Hadkar Meals Admin")
                .active(true)
                .profileComplete(true)
                .build();
    }

    @Transactional
    public AuthResponse verifyOtp(VerifyOtpRequest request) {
        String phone = cleanPhoneNumber(request.getPhoneNumber());
        boolean verified = otpService.verifyOtp(phone, request.getOtp());

        if (!verified) {
            throw new BusinessException("Failed to verify OTP. Incorrect or expired code.");
        }

        // For login, user must exist in database
        User user = userRepository.findByPhoneNumber(phone)
                .orElseThrow(() -> new BusinessException("Account not found for " + phone + ". Please sign up first!"));

        Optional<Student> studentOpt = studentRepository.findByUserId(user.getId());

        Long studentId = studentOpt.map(Student::getId).orElse(null);
        String fullName = studentOpt.map(Student::getFullName).orElse(null);
        String hostelName = studentOpt.map(s -> s.getHostel() != null ? s.getHostel().getName() : null).orElse(null);
        boolean profileComplete = studentOpt.isPresent() && studentOpt.get().getHostel() != null;

        String token = tokenProvider.generateToken(user.getPhoneNumber(), user.getRole(), user.getId(), studentId);

        auditLogService.log(
                "USER_LOGIN",
                phone,
                "User",
                String.valueOf(user.getId()),
                "Logged in with role: " + user.getRole()
        );

        return AuthResponse.builder()
                .token(token)
                .role(user.getRole())
                .phoneNumber(user.getPhoneNumber())
                .email(user.getEmail())
                .userId(user.getId())
                .studentId(studentId)
                .fullName(fullName)
                .hostelName(hostelName)
                .active(user.getActive())
                .profileComplete(profileComplete)
                .build();
    }

    public AuthResponse getCurrentUserInfo(String phoneNumber) {
        User user = userRepository.findByPhoneNumber(phoneNumber)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with phone: " + phoneNumber));

        Optional<Student> studentOpt = studentRepository.findByUserId(user.getId());
        Long studentId = studentOpt.map(Student::getId).orElse(null);
        String fullName = studentOpt.map(Student::getFullName).orElse(null);
        String hostelName = studentOpt.map(s -> s.getHostel() != null ? s.getHostel().getName() : null).orElse(null);
        boolean profileComplete = studentOpt.isPresent() && studentOpt.get().getHostel() != null;

        return AuthResponse.builder()
                .role(user.getRole())
                .phoneNumber(user.getPhoneNumber())
                .email(user.getEmail())
                .userId(user.getId())
                .studentId(studentId)
                .fullName(fullName != null ? fullName : (user.getRole() == Role.ROLE_SUPER_ADMIN ? "Super Admin (Developer)" : (user.getRole() == Role.ROLE_ADMIN ? "Hadkar Meals Admin" : "User")))
                .hostelName(hostelName)
                .active(user.getActive())
                .profileComplete(user.getRole() == Role.ROLE_SUPER_ADMIN || user.getRole() == Role.ROLE_ADMIN || profileComplete)
                .build();
    }

    @Transactional
    public void resetClientPassword(String email, String newPassword) {
        User user = userRepository.findByEmail(email.trim().toLowerCase())
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email));
        user.setPassword(newPassword.trim());
        userRepository.save(user);
    }

    public static boolean isValidIndianMobileNumber(String phone) {
        if (phone == null) return false;
        String digits = phone.replaceAll("[^0-9]", "");
        if (digits.startsWith("91") && digits.length() == 12) {
            digits = digits.substring(2);
        } else if (digits.startsWith("0") && digits.length() == 11) {
            digits = digits.substring(1);
        }
        if (digits.length() != 10) return false;

        // Valid Indian mobile numbers start with 6, 7, 8, or 9
        if (!digits.matches("^[6-9]\\d{9}$")) {
            return false;
        }

        // Reject repeated digits (e.g. 9999999999, 8888888888, 7777777777, 6666666666)
        char first = digits.charAt(0);
        boolean allSame = true;
        for (int i = 1; i < 10; i++) {
            if (digits.charAt(i) != first) {
                allSame = false;
                break;
            }
        }
        if (allSame) return false;

        // Reject obvious fake test patterns
        if (digits.equals("9876543210") || digits.equals("9876543211") || digits.equals("9123456789") || digits.equals("9000000000")) {
            return false;
        }

        return true;
    }

    private String cleanPhoneNumber(String phone) {
        if (phone == null) return "";
        String digits = phone.replaceAll("[^0-9]", "");
        if (digits.startsWith("91") && digits.length() == 12) {
            digits = digits.substring(2);
        } else if (digits.startsWith("0") && digits.length() == 11) {
            digits = digits.substring(1);
        }
        return digits;
    }
}
