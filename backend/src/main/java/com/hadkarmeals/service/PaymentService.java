package com.hadkarmeals.service;

import com.hadkarmeals.dto.RecordPaymentRequest;
import com.hadkarmeals.entity.*;
import com.hadkarmeals.exception.ResourceNotFoundException;
import com.hadkarmeals.repository.MonthlyBillRepository;
import com.hadkarmeals.repository.PaymentRepository;
import com.hadkarmeals.repository.StudentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final StudentRepository studentRepository;
    private final MonthlyBillRepository billRepository;
    private final LedgerService ledgerService;
    private final AuditLogService auditLogService;
    private final NotificationService notificationService;

    public PaymentService(
            PaymentRepository paymentRepository,
            StudentRepository studentRepository,
            MonthlyBillRepository billRepository,
            LedgerService ledgerService,
            AuditLogService auditLogService,
            NotificationService notificationService) {
        this.paymentRepository = paymentRepository;
        this.studentRepository = studentRepository;
        this.billRepository = billRepository;
        this.ledgerService = ledgerService;
        this.auditLogService = auditLogService;
        this.notificationService = notificationService;
    }

    @Transactional
    public Payment recordPayment(RecordPaymentRequest request, String adminUsername) {
        Student student = studentRepository.findById(request.getStudentId())
                .orElseThrow(() -> new ResourceNotFoundException("Student not found with ID: " + request.getStudentId()));

        BigDecimal amount = request.getAmount().setScale(2, RoundingMode.HALF_UP);
        LocalDate paymentDate = request.getPaymentDate() != null ? request.getPaymentDate() : LocalDate.now();

        Payment payment = Payment.builder()
                .student(student)
                .amount(amount)
                .paymentMethod(request.getPaymentMethod())
                .paymentDate(paymentDate)
                .referenceNote(request.getReferenceNote())
                .recordedBy(adminUsername != null ? adminUsername : "ADMIN")
                .build();

        payment = paymentRepository.save(payment);

        // Record in ledger
        ledgerService.recordTransaction(
                student,
                amount,
                TransactionType.PAYMENT,
                "Payment received via " + request.getPaymentMethod() + (request.getReferenceNote() != null ? " (" + request.getReferenceNote() + ")" : ""),
                "PAY-" + payment.getId(),
                adminUsername
        );

        // Update corresponding month's bill if present
        String currentMonth = paymentDate.format(DateTimeFormatter.ofPattern("yyyy-MM"));
        billRepository.findByStudentIdAndMonthYear(student.getId(), currentMonth).ifPresent(bill -> {
            bill.setPaidAmount(bill.getPaidAmount().add(amount));
            bill.recalculate();
            billRepository.save(bill);
        });

        // Audit log
        auditLogService.log(
                "PAYMENT_RECORDED",
                adminUsername,
                "Payment",
                String.valueOf(payment.getId()),
                "Recorded payment of ₹" + amount + " via " + request.getPaymentMethod() + " for " + student.getFullName()
        );

        // Notification to student
        notificationService.sendStudentNotification(
                student,
                "✅ Payment Received",
                "Received payment of ₹" + amount + " via " + request.getPaymentMethod() + ". Thank you!",
                NotificationType.PAYMENT_RECEIVED,
                NotificationChannel.IN_APP
        );

        return payment;
    }

    public List<Payment> getStudentPayments(Long studentId) {
        return paymentRepository.findByStudentIdOrderByPaymentDateDesc(studentId);
    }
}
