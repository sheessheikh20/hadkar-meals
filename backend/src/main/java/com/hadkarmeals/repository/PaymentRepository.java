package com.hadkarmeals.repository;

import com.hadkarmeals.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    List<Payment> findByStudentIdOrderByPaymentDateDesc(Long studentId);
    List<Payment> findByStudentIdAndPaymentDateBetween(Long studentId, LocalDate start, LocalDate end);
    List<Payment> findByPaymentDateBetweenOrderByPaymentDateDesc(LocalDate start, LocalDate end);
}
