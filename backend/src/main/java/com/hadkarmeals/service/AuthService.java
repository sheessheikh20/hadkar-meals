package com.hadkarmeals.service;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseToken;
import com.hadkarmeals.dto.*;
import com.hadkarmeals.entity.Hostel;
import com.hadkarmeals.entity.Role;
import com.hadkarmeals.entity.Student;
import com.hadkarmeals.entity.User;
import com.hadkarmeals.exception.BusinessException;
import com.hadkarmeals.exception.ResourceNotFoundException;
import com.hadkarmeals.repository.EmailOtpRepository;
import com.hadkarmeals.repository.HostelRepository;
import com.hadkarmeals.repository.StudentRepository;
import com.hadkarmeals.repository.UserRepository;
import com.hadkarmeals.security.JwtTokenProvider;
import com.hadkarmeals.service.ResendEmailService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.annotation.PostConstruct;
import java.io.InputStream;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final StudentRepository studentRepository;
    private final JwtTokenProvider tokenProvider;
    private final StudentService studentService;
    private final AuditLogService auditLogService;
    private final HostelRepository hostelRepository;
    private final EmailOtpRepository emailOtpRepository;
    private final ResendEmailService resendEmailService;
    
    private Set<String> disposableDomains = new HashSet<>();

    public AuthService(
            UserRepository userRepository,
            StudentRepository studentRepository,
            HostelRepository hostelRepository,
            JwtTokenProvider tokenProvider,
            StudentService studentService,
            AuditLogService auditLogService) {
        this.userRepository = userRepository;
        this.studentRepository = studentRepository;
        this.hostelRepository = hostelRepository;
        this.tokenProvider = tokenProvider;
        this.studentService = studentService;
        this.auditLogService = auditLogService;
    }

    @PostConstruct
    public void init() {
        try {
            ObjectMapper mapper = new ObjectMapper();
            InputStream is = new ClassPathResource("disposable_domains.json").getInputStream();
            List<String> domains = mapper.readValue(is, new TypeReference<List<String>>() {});
            disposableDomains.addAll(domains);
        } catch (Exception e) {
            System.err.println("Failed to load disposable domains list. Proceeding with empty list.");
        }
    }

    // ── Google Sign-In ────────────────────────────────────────────────────────
    @Transactional
    public AuthResponse googleLogin(GoogleAuthRequest request) {
        FirebaseToken decoded;
        try {
            decoded = FirebaseAuth.getInstance().verifyIdToken(request.getIdToken());
        } catch (Exception e) {
            throw new BusinessException("Invalid Google token. Please try signing in again.");
        }

        String googleUid = decoded.getUid();
        String email = decoded.getEmail() != null ? decoded.getEmail().toLowerCase().trim() : null;
        String name = decoded.getName();

        if (email != null && isDisposableEmail(email)) {
            throw new BusinessException("Temporary or disposable emails are not allowed.");
        }

        // 1. Try find existing user by googleId first, then by email
        User user = userRepository.findByGoogleId(googleUid)
                .orElseGet(() -> email != null ? userRepository.findByEmail(email).orElse(null) : null);

        boolean isNewUser = (user == null);

        if (isNewUser) {
            // Create a new stub user — no phone, no password yet (profile completion required)
            user = User.builder()
                    .phoneNumber("G_" + java.util.UUID.randomUUID().toString().substring(0, 12))  // placeholder, replaced on profile completion
                    .email(email)
                    .googleId(googleUid)
                    .googleName(name)
                    .password(null)
                    .role(Role.ROLE_STUDENT)
                    .active(true)
                    .build();
            user = userRepository.save(user);
        } else {
            // Link googleId if account existed but signed in with Google for the first time
            if (user.getGoogleId() == null) {
                user.setGoogleId(googleUid);
                user.setGoogleName(name);
                userRepository.save(user);
            }
        }

        Optional<Student> studentOpt = studentRepository.findByUserId(user.getId());
        Long studentId = studentOpt.map(Student::getId).orElse(null);
        String fullName = studentOpt.map(Student::getFullName).orElse(name);
        String hostelName = studentOpt.map(s -> s.getHostel() != null ? s.getHostel().getName() : null).orElse(null);
        boolean profileComplete = studentOpt.isPresent() && studentOpt.get().getHostel() != null
                && studentOpt.get().getPhoneNumber() != null
                && !studentOpt.get().getPhoneNumber().startsWith("G_");

        String token = tokenProvider.generateToken(user.getPhoneNumber(), user.getRole(), user.getId(), studentId);

        auditLogService.log(
                isNewUser ? "GOOGLE_REGISTER" : "GOOGLE_LOGIN",
                user.getPhoneNumber(),
                "User",
                String.valueOf(user.getId()),
                (isNewUser ? "New user via Google: " : "Existing user via Google: ") + email
        );

        return AuthResponse.builder()
                .token(token)
                .role(user.getRole())
                .phoneNumber(user.getPhoneNumber().startsWith("G_") ? null : user.getPhoneNumber())
                .email(user.getEmail())
                .userId(user.getId())
                .studentId(studentId)
                .fullName(fullName)
                .hostelName(hostelName)
                .active(user.getActive())
                .profileComplete(profileComplete)
                .build();
    }

    // ── Complete Profile (after Google Sign-In for new users) ─────────────────
    @Transactional
    public AuthResponse completeGoogleProfile(String userPhone, CompleteProfileRequest request) {
        User user = userRepository.findByPhoneNumber(userPhone)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        String phone = cleanPhoneNumber(request.getPhoneNumber());
        if (!isValidIndianMobileNumber(phone)) {
            throw new BusinessException("Invalid mobile number. Please enter a valid 10-digit Indian number.");
        }

        // Validate name against Google account name
        if (user.getGoogleName() != null && request.getFullName() != null) {
            String enteredName = request.getFullName().trim().toLowerCase();
            String gName = user.getGoogleName().trim().toLowerCase();
            // Basic matching: either exact match, or entered name is part of Google name, or vice versa
            if (!enteredName.equals(gName) && !gName.contains(enteredName) && !enteredName.contains(gName)) {
                throw new BusinessException("Name mismatch. Please use your real name as it appears on your Google Account: " + user.getGoogleName());
            }
        }

        // Check if this phone is already taken by a different user
        userRepository.findByPhoneNumber(phone).ifPresent(existing -> {
            if (!existing.getId().equals(user.getId())) {
                throw new BusinessException("This mobile number is already registered with another account.");
            }
        });

        // Update user phone (replace the G_ placeholder)
        user.setPhoneNumber(phone);
        userRepository.save(user);

        // Find/create hostel
        Hostel hostel = hostelRepository.findById(request.getHostelId())
                .orElseThrow(() -> new ResourceNotFoundException("Selected delivery location not found"));

        // Create or update Student profile
        Student student = studentRepository.findByUserId(user.getId()).orElse(
                Student.builder().user(user).active(true).build()
        );
        student.setFullName(request.getFullName().trim());
        student.setPhoneNumber(phone);
        student.setEmail(user.getEmail());
        student.setHostel(hostel);
        student = studentRepository.save(student);

        String token = tokenProvider.generateToken(user.getPhoneNumber(), user.getRole(), user.getId(), student.getId());

        auditLogService.log(
                "PROFILE_COMPLETED",
                phone,
                "Student",
                String.valueOf(student.getId()),
                "Profile completed for: " + student.getFullName() + " at " + hostel.getName()
        );

        return AuthResponse.builder()
                .token(token)
                .role(user.getRole())
                .phoneNumber(phone)
                .email(user.getEmail())
                .userId(user.getId())
                .studentId(student.getId())
                .fullName(student.getFullName())
                .hostelName(hostel.getName())
                .active(true)
                .profileComplete(true)
                .build();
    }

    // ── Direct Registration (no OTP) ─────────────────────────────────────────
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String phone = cleanPhoneNumber(request.getPhoneNumber());

        if (!isValidIndianMobileNumber(phone)) {
            throw new BusinessException("Invalid mobile number. Please enter an authentic 10-digit Indian mobile number starting with 6, 7, 8, or 9.");
        }

        if (userRepository.existsByPhoneNumber(phone)) {
            throw new BusinessException("This mobile number is already registered. Please go to Login.");
        }

        if (request.getEmail() != null && !request.getEmail().trim().isEmpty()) {
            String emailStr = request.getEmail().trim().toLowerCase();
            if (isDisposableEmail(emailStr)) {
                throw new BusinessException("Temporary or disposable emails are not allowed.");
            }
        }

        if (request.getPassword() == null || request.getPassword().trim().length() < 6) {
            throw new BusinessException("Password must be at least 6 characters.");
        }

        // Find Delivery Location
        Hostel hostel = hostelRepository.findById(request.getHostelId())
                .orElseThrow(() -> new ResourceNotFoundException("Selected delivery location not found"));

        // Create User
        User user = User.builder()
                .phoneNumber(phone)
                .email(request.getEmail() != null && !request.getEmail().trim().isEmpty() ? request.getEmail().trim().toLowerCase() : null)
                .password(request.getPassword().trim())
                .role(Role.ROLE_STUDENT)
                .active(true)
                .build();
        user = userRepository.save(user);

        // Create Student / Customer Profile
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

    // ── Password Login (universal: Student, Admin, Super Admin) ──────────────
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

    // ── Admin Login ───────────────────────────────────────────────────────────
    public AuthResponse adminLogin(AdminLoginRequest request) {
        String identifier = request.getEmail().trim().toLowerCase();
        String cleaned = cleanPhoneNumber(identifier);
        String altPhone = cleaned.startsWith("0") ? cleaned.substring(1) : "0" + cleaned;

        User user = userRepository.findByEmail(identifier)
                .or(() -> userRepository.findByPhoneNumber(cleaned))
                .or(() -> userRepository.findByPhoneNumber(altPhone))
                .orElseThrow(() -> new BusinessException("Invalid admin credentials. Account not found."));

        if (user.getRole() != Role.ROLE_ADMIN) {
            throw new BusinessException("Access denied. You do not have administrator privileges.");
        }

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
                .fullName("Hadkar Meals Admin")
                .active(true)
                .profileComplete(true)
                .build();
    }

    // ── Current User Info ─────────────────────────────────────────────────────
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

    // ── Reset Client Password (Super Admin) ───────────────────────────────────
    @Transactional
    public void resetClientPassword(String email, String newPassword) {
        User user = userRepository.findByEmail(email.trim().toLowerCase())
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email));
        user.setPassword(newPassword.trim());
        userRepository.save(user);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    public boolean isDisposableEmail(String email) {
        if (email == null || !email.contains("@")) return false;
        String domain = email.substring(email.lastIndexOf("@") + 1).toLowerCase();
        
        if (disposableDomains.contains(domain)) {
            return true;
        }

        // Live API Checks
        org.springframework.web.client.RestTemplate restTemplate = new org.springframework.web.client.RestTemplate();
        
        try {
            // Kickbox API
            String kickboxUrl = "https://open.kickbox.com/v1/disposable/" + email;
            String kickboxResponse = restTemplate.getForObject(kickboxUrl, String.class);
            if (kickboxResponse != null && kickboxResponse.contains("\"disposable\":true")) {
                return true;
            }
        } catch (Exception e) {
            System.err.println("Kickbox API failed: " + e.getMessage());
        }

        try {
            // Debounce API
            String debounceUrl = "https://disposable.debounce.io/?email=" + email;
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.set("User-Agent", "Mozilla/5.0");
            org.springframework.http.HttpEntity<String> entity = new org.springframework.http.HttpEntity<>("parameters", headers);
            org.springframework.http.ResponseEntity<String> debounceResponse = restTemplate.exchange(
                    debounceUrl, org.springframework.http.HttpMethod.GET, entity, String.class);
            if (debounceResponse.getBody() != null && debounceResponse.getBody().contains("\"disposable\":\"true\"")) {
                return true;
            }
        } catch (Exception e) {
            System.err.println("Debounce API failed: " + e.getMessage());
        }

        return false;
    }

    // ── OTP Methods ───────────────────────────────────────────────────────────
    @Transactional
    public void generateAndSendOtp(String email) {
        if (email == null || email.trim().isEmpty()) {
            throw new BusinessException("Email is required");
        }
        String cleanEmail = email.trim().toLowerCase();

        // 1. Block disposable emails
        if (isDisposableEmail(cleanEmail)) {
            throw new BusinessException("Temporary or disposable emails are not allowed.");
        }

        // 2. Generate 6 digit OTP
        String otp = String.format("%06d", new java.util.Random().nextInt(999999));

        // 3. Save to DB
        EmailOtp emailOtp = emailOtpRepository.findByEmail(cleanEmail).orElse(new EmailOtp());
        emailOtp.setEmail(cleanEmail);
        emailOtp.setOtp(otp);
        emailOtp.setExpiresAt(java.time.LocalDateTime.now().plusMinutes(10));
        emailOtpRepository.save(emailOtp);

        // 4. Send email
        resendEmailService.sendOtpEmail(cleanEmail, otp);
    }

    @Transactional
    public void verifyOtp(String email, String otp) {
        if (email == null || otp == null) {
            throw new BusinessException("Email and OTP are required");
        }
        String cleanEmail = email.trim().toLowerCase();

        EmailOtp emailOtp = emailOtpRepository.findByEmail(cleanEmail)
                .orElseThrow(() -> new BusinessException("No OTP found for this email. Please request a new one."));

        if (emailOtp.getExpiresAt().isBefore(java.time.LocalDateTime.now())) {
            throw new BusinessException("OTP has expired. Please request a new one.");
        }

        if (!emailOtp.getOtp().equals(otp.trim())) {
            throw new BusinessException("Invalid OTP code.");
        }

        // OTP is valid! Delete it so it can't be reused
        emailOtpRepository.delete(emailOtp);
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
        if (!digits.matches("^[6-9]\\d{9}$")) return false;
        char first = digits.charAt(0);
        boolean allSame = true;
        for (int i = 1; i < 10; i++) {
            if (digits.charAt(i) != first) { allSame = false; break; }
        }
        if (allSame) return false;
        if (digits.equals("9876543210") || digits.equals("9876543211") || digits.equals("9123456789") || digits.equals("9000000000")) return false;
        return true;
    }

    private String cleanPhoneNumber(String phone) {
        if (phone == null) return "";
        String digits = phone.replaceAll("[^0-9]", "");
        if (digits.startsWith("91") && digits.length() == 12) digits = digits.substring(2);
        else if (digits.startsWith("0") && digits.length() == 11) digits = digits.substring(1);
        return digits;
    }
}
