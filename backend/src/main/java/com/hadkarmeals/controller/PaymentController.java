package com.hadkarmeals.controller;

import com.hadkarmeals.dto.RecordPaymentRequest;
import com.hadkarmeals.entity.Payment;
import com.hadkarmeals.entity.Student;
import com.hadkarmeals.exception.ResourceNotFoundException;
import com.hadkarmeals.repository.StudentRepository;
import com.hadkarmeals.service.PaymentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/payments")
@Tag(name = "Payments", description = "Record cash/UPI/bank payments and track payment history")
public class PaymentController {

    private final PaymentService paymentService;
    private final StudentRepository studentRepository;

    public PaymentController(PaymentService paymentService, StudentRepository studentRepository) {
        this.paymentService = paymentService;
        this.studentRepository = studentRepository;
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Record a new student payment (Cash, UPI, Bank Transfer)")
    public ResponseEntity<Payment> recordPayment(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody RecordPaymentRequest request) {
        return ResponseEntity.ok(paymentService.recordPayment(request, userDetails.getUsername()));
    }

    @GetMapping("/my-payments")
    @Operation(summary = "Get payment history for logged-in student")
    public ResponseEntity<List<Payment>> getMyPayments(@AuthenticationPrincipal UserDetails userDetails) {
        Student student = studentRepository.findByPhoneNumber(userDetails.getUsername())
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found"));

        return ResponseEntity.ok(paymentService.getStudentPayments(student.getId()));
    }

    @GetMapping("/student/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Admin view payments for a specific student")
    public ResponseEntity<List<Payment>> getStudentPaymentsAdmin(@PathVariable Long id) {
        return ResponseEntity.ok(paymentService.getStudentPayments(id));
    }
}
