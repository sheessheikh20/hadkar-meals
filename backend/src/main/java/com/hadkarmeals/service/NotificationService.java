package com.hadkarmeals.service;

import com.hadkarmeals.entity.*;
import com.hadkarmeals.repository.NotificationRepository;
import com.hadkarmeals.repository.NotificationTemplateRepository;
import com.hadkarmeals.repository.OrderRepository;
import com.hadkarmeals.repository.StudentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    private final NotificationRepository notificationRepository;
    private final NotificationTemplateRepository templateRepository;
    private final StudentRepository studentRepository;
    private final OrderRepository orderRepository;
    private final FirebaseNotificationService firebaseNotificationService;

    public NotificationService(
            NotificationRepository notificationRepository,
            NotificationTemplateRepository templateRepository,
            StudentRepository studentRepository,
            OrderRepository orderRepository,
            FirebaseNotificationService firebaseNotificationService) {
        this.notificationRepository = notificationRepository;
        this.templateRepository = templateRepository;
        this.studentRepository = studentRepository;
        this.orderRepository = orderRepository;
        this.firebaseNotificationService = firebaseNotificationService;
    }

    @Transactional
    public Notification sendStudentNotification(
            Student student,
            String title,
            String message,
            NotificationType type,
            NotificationChannel channel) {

        Notification notification = Notification.builder()
                .student(student)
                .title(title)
                .message(message)
                .type(type)
                .channel(channel != null ? channel : NotificationChannel.IN_APP)
                .readStatus(false)
                .sentStatus("SENT")
                .createdAt(LocalDateTime.now())
                .build();

        notification = notificationRepository.save(notification);

        if (type != NotificationType.ANNOUNCEMENT && student.getUser() != null) {
            try {
                firebaseNotificationService.sendPushToUser(
                        student.getUser().getId(),
                        title,
                        message,
                        "/student/dashboard"
                );
            } catch (Exception e) {
                log.warn("Failed to dispatch push to student {}: {}", student.getId(), e.getMessage());
            }
        }

        if (channel == NotificationChannel.SMS) {
            log.info("[SMS GATEWAY] To: {} ({}) - Message: {}",
                    student.getPhoneNumber(), student.getFullName(), message);
        } else if (channel == NotificationChannel.WHATSAPP) {
            log.info("[WHATSAPP GATEWAY] To: {} ({}) - Message: {}",
                    student.getPhoneNumber(), student.getFullName(), message);
        }

        return notification;
    }

    @Transactional
    public int sendClosingReminder(Meal meal, int minutesRemaining) {
        // SMART TARGETING: only active students who have NOT ordered for this meal
        List<Student> activeStudents = studentRepository.findByActive(true);
        List<Order> confirmedOrders = orderRepository.findByOrderDateAndMealTypeAndStatusIn(
                meal.getMealDate(), meal.getMealType(), List.of(OrderStatus.CONFIRMED));

        Set<Long> orderedStudentIds = new HashSet<>();
        for (Order o : confirmedOrders) {
            orderedStudentIds.add(o.getStudent().getId());
        }

        int count = 0;
        String title = "🍽️ Dinner Orders Closing Soon!";
        String message = String.format("🍽️ Dinner orders close in %d minutes (at %s). You haven't placed your dinner order yet!",
                minutesRemaining, meal.getOrderCutoffTime());

        for (Student student : activeStudents) {
            if (!orderedStudentIds.contains(student.getId())) {
                sendStudentNotification(student, title, message,
                        NotificationType.CLOSING_REMINDER, NotificationChannel.IN_APP);
                count++;
            }
        }
        return count;
    }

    @Transactional
    public int broadcast(String title, String message, NotificationChannel channel, String targetGroup, Long hostelId, MealType mealType, List<Long> studentIds) {
        List<Student> targets = new ArrayList<>();

        if ("SELECTED".equalsIgnoreCase(targetGroup) && studentIds != null && !studentIds.isEmpty()) {
            targets = studentRepository.findAllById(studentIds);
        } else if ("HOSTEL".equalsIgnoreCase(targetGroup) && hostelId != null) {
            targets = studentRepository.findByHostelId(hostelId);
        } else if ("UNORDERED_STUDENTS".equalsIgnoreCase(targetGroup) && mealType != null) {
            List<Student> activeStudents = studentRepository.findByActive(true);
            List<Order> confirmed = orderRepository.findByOrderDateAndMealTypeAndStatusIn(
                    LocalDate.now(), mealType, List.of(OrderStatus.CONFIRMED));
            Set<Long> ordered = new HashSet<>();
            for (Order o : confirmed) ordered.add(o.getStudent().getId());

            for (Student s : activeStudents) {
                if (!ordered.contains(s.getId())) {
                    targets.add(s);
                }
            }
        } else {
            // Default: All active
            targets = studentRepository.findByActive(true);
        }

        for (Student student : targets) {
            sendStudentNotification(student, title, message, NotificationType.ANNOUNCEMENT, channel);
        }
        try {
            firebaseNotificationService.sendPushToAllActive(title, message, "/student/dashboard");
        } catch (Exception e) {
            log.warn("Failed to dispatch push notification: {}", e.getMessage());
        }
        return targets.size();
    }

    public List<Notification> getStudentNotifications(Long studentId) {
        return notificationRepository.findByStudentIdOrderByCreatedAtDesc(studentId);
    }

    public long getUnreadCount(Long studentId) {
        return notificationRepository.countByStudentIdAndReadStatusFalse(studentId);
    }

    @Transactional
    public void markAsRead(Long notificationId) {
        notificationRepository.findById(notificationId).ifPresent(n -> {
            n.setReadStatus(true);
            notificationRepository.save(n);
        });
    }

    @Transactional
    public void markAllAsRead(Long studentId) {
        List<Notification> unread = notificationRepository.findByStudentIdAndReadStatusFalseOrderByCreatedAtDesc(studentId);
        for (Notification n : unread) {
            n.setReadStatus(true);
        }
        notificationRepository.saveAll(unread);
    }
}
