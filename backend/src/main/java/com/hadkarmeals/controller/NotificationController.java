package com.hadkarmeals.controller;

import com.hadkarmeals.entity.*;
import com.hadkarmeals.repository.MealRepository;
import com.hadkarmeals.repository.NotificationRepository;
import com.hadkarmeals.repository.StudentRepository;
import com.hadkarmeals.repository.UserRepository;
import com.hadkarmeals.service.FirebaseNotificationService;
import com.hadkarmeals.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@Tag(name = "Push & In-App Notifications", description = "FCM device registration, notifications and closing reminders")
public class NotificationController {

    private final FirebaseNotificationService firebaseNotificationService;
    private final NotificationService notificationService;
    private final MealRepository mealRepository;
    private final StudentRepository studentRepository;
    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    public NotificationController(
            FirebaseNotificationService firebaseNotificationService,
            NotificationService notificationService,
            MealRepository mealRepository,
            StudentRepository studentRepository,
            NotificationRepository notificationRepository,
            UserRepository userRepository) {
        this.firebaseNotificationService = firebaseNotificationService;
        this.notificationService = notificationService;
        this.mealRepository = mealRepository;
        this.studentRepository = studentRepository;
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
    }

    @PostMapping("/send-closing-reminder")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Send dinner ordering closing reminder to all students who have not placed an order yet")
    public ResponseEntity<Map<String, Object>> sendClosingReminder(
            @RequestParam(defaultValue = "15") int minutesRemaining) {
        LocalDate today = LocalDate.now();
        Meal meal = mealRepository.findByMealDateAndMealType(today, MealType.DINNER)
                .filter(m -> m.getStatus() == MealStatus.PUBLISHED)
                .orElseGet(() -> mealRepository.findByMealDate(today).stream()
                        .filter(m -> m.getStatus() == MealStatus.PUBLISHED)
                        .findFirst()
                        .orElse(null));

        if (meal == null) {
            return ResponseEntity.ok(Map.of(
                    "notifiedUnorderedStudents", 0,
                    "message", "No published dinner menu active to send reminders for."
            ));
        }

        int count = notificationService.sendClosingReminder(meal, minutesRemaining);
        return ResponseEntity.ok(Map.of(
                "notifiedUnorderedStudents", count,
                "message", "Closing reminder sent to " + count + " customers."
        ));
    }

    @GetMapping("/my")
    @Operation(summary = "Get current authenticated student's notifications")
    public ResponseEntity<List<Notification>> getMyNotifications(@AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) return ResponseEntity.ok(List.of());
        User user = userRepository.findByPhoneNumber(userDetails.getUsername())
                .or(() -> userRepository.findByEmail(userDetails.getUsername()))
                .orElse(null);
        if (user == null) return ResponseEntity.ok(List.of());
        Student student = studentRepository.findByUserId(user.getId()).orElse(null);
        if (student == null) return ResponseEntity.ok(List.of());
        return ResponseEntity.ok(notificationRepository.findByStudentIdOrderByCreatedAtDesc(student.getId()));
    }

    @GetMapping("/unread-count")
    @Operation(summary = "Get unread notifications count for current student")
    public ResponseEntity<Map<String, Long>> getUnreadCount(@AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) return ResponseEntity.ok(Map.of("count", 0L));
        User user = userRepository.findByPhoneNumber(userDetails.getUsername())
                .or(() -> userRepository.findByEmail(userDetails.getUsername()))
                .orElse(null);
        if (user == null) return ResponseEntity.ok(Map.of("count", 0L));
        Student student = studentRepository.findByUserId(user.getId()).orElse(null);
        if (student == null) return ResponseEntity.ok(Map.of("count", 0L));
        return ResponseEntity.ok(Map.of("count", notificationRepository.countByStudentIdAndReadStatusFalse(student.getId())));
    }

    @PostMapping("/{id}/read")
    @Operation(summary = "Mark a notification as read")
    public ResponseEntity<Void> markAsRead(@PathVariable Long id) {
        notificationRepository.findById(id).ifPresent(n -> {
            n.setReadStatus(true);
            notificationRepository.save(n);
        });
        return ResponseEntity.ok().build();
    }

    @PostMapping("/mark-all-read")
    @Operation(summary = "Mark all notifications as read for current student")
    public ResponseEntity<Void> markAllAsRead(@AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails != null) {
            User user = userRepository.findByPhoneNumber(userDetails.getUsername())
                    .or(() -> userRepository.findByEmail(userDetails.getUsername()))
                    .orElse(null);
            if (user != null) {
                studentRepository.findByUserId(user.getId()).ifPresent(s -> {
                    List<Notification> unread = notificationRepository.findByStudentIdAndReadStatusFalseOrderByCreatedAtDesc(s.getId());
                    unread.forEach(n -> n.setReadStatus(true));
                    notificationRepository.saveAll(unread);
                });
            }
        }
        return ResponseEntity.ok().build();
    }

    @PostMapping("/register-token")
    @Operation(summary = "Register FCM device token for authenticated user")
    public ResponseEntity<Map<String, String>> registerToken(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody Map<String, String> payload) {

        String token = payload.get("token");
        String deviceType = payload.getOrDefault("deviceType", "WEB");

        if (token != null && !token.isBlank() && userDetails != null) {
            firebaseNotificationService.registerDeviceToken(userDetails.getUsername(), token, deviceType);
            return ResponseEntity.ok(Map.of("message", "FCM token registered successfully"));
        }
        return ResponseEntity.badRequest().body(Map.of("error", "Token and authentication required"));
    }

    @PostMapping("/unregister-token")
    @Operation(summary = "Unregister FCM device token on logout")
    public ResponseEntity<Map<String, String>> unregisterToken(@RequestBody Map<String, String> payload) {
        String token = payload.get("token");
        if (token != null && !token.isBlank()) {
            firebaseNotificationService.unregisterDeviceToken(token);
            return ResponseEntity.ok(Map.of("message", "FCM token unregistered"));
        }
        return ResponseEntity.badRequest().body(Map.of("error", "Token required"));
    }
}
