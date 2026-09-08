package com.hadkarmeals.service;

import com.hadkarmeals.dto.AddExtraChargeRequest;
import com.hadkarmeals.entity.*;
import com.hadkarmeals.exception.ResourceNotFoundException;
import com.hadkarmeals.repository.ExtraChargeRepository;
import com.hadkarmeals.repository.StudentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;

@Service
public class ExtraChargeService {

    private final ExtraChargeRepository extraChargeRepository;
    private final StudentRepository studentRepository;
    private final LedgerService ledgerService;
    private final AuditLogService auditLogService;
    private final NotificationService notificationService;

    public ExtraChargeService(
            ExtraChargeRepository extraChargeRepository,
            StudentRepository studentRepository,
            LedgerService ledgerService,
            AuditLogService auditLogService,
            NotificationService notificationService) {
        this.extraChargeRepository = extraChargeRepository;
        this.studentRepository = studentRepository;
        this.ledgerService = ledgerService;
        this.auditLogService = auditLogService;
        this.notificationService = notificationService;
    }

    @Transactional
    public ExtraCharge addExtraCharge(AddExtraChargeRequest request, String adminUsername) {
        Student student = studentRepository.findById(request.getStudentId())
                .orElseThrow(() -> new ResourceNotFoundException("Student not found with ID: " + request.getStudentId()));

        BigDecimal total = request.getUnitPrice()
                .multiply(BigDecimal.valueOf(request.getQuantity()))
                .setScale(2, RoundingMode.HALF_UP);

        ExtraCharge charge = ExtraCharge.builder()
                .student(student)
                .itemDescription(request.getItemDescription())
                .quantity(request.getQuantity())
                .unitPrice(request.getUnitPrice().setScale(2, RoundingMode.HALF_UP))
                .totalAmount(total)
                .chargeDate(request.getChargeDate() != null ? request.getChargeDate() : LocalDate.now())
                .notes(request.getNotes())
                .active(true)
                .build();

        charge = extraChargeRepository.save(charge);

        // Record in ledger
        ledgerService.recordTransaction(
                student,
                total,
                TransactionType.EXTRA_CHARGE,
                "Extra: " + request.getItemDescription() + " (Qty: " + request.getQuantity() + ")",
                "CHARGE-" + charge.getId(),
                adminUsername
        );

        // Audit log
        auditLogService.log(
                "EXTRA_CHARGE_ADDED",
                adminUsername,
                "ExtraCharge",
                String.valueOf(charge.getId()),
                "Added extra charge of ₹" + total + " (" + request.getItemDescription() + ") for " + student.getFullName()
        );

        // Notification
        notificationService.sendStudentNotification(
                student,
                "➕ Extra Charge Added",
                "₹" + total + " added for " + request.getItemDescription() + " (Qty: " + request.getQuantity() + ").",
                NotificationType.ANNOUNCEMENT,
                NotificationChannel.IN_APP
        );

        return charge;
    }

    public List<ExtraCharge> getStudentCharges(Long studentId) {
        return extraChargeRepository.findByStudentIdOrderByChargeDateDesc(studentId);
    }
}
