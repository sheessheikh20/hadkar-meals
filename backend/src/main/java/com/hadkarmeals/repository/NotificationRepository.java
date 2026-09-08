package com.hadkarmeals.repository;

import com.hadkarmeals.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByStudentIdOrderByCreatedAtDesc(Long studentId);
    List<Notification> findByStudentIdAndReadStatusFalseOrderByCreatedAtDesc(Long studentId);
    long countByStudentIdAndReadStatusFalse(Long studentId);
    List<Notification> findTop50ByOrderByCreatedAtDesc();
}
