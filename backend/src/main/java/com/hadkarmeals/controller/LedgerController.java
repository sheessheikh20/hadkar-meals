package com.hadkarmeals.controller;

import com.hadkarmeals.dto.LedgerTransactionResponse;
import com.hadkarmeals.entity.LedgerTransaction;
import com.hadkarmeals.entity.Student;
import com.hadkarmeals.exception.ResourceNotFoundException;
import com.hadkarmeals.repository.StudentRepository;
import com.hadkarmeals.service.LedgerService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/ledger")
@Tag(name = "Ledger Management", description = "Immutable financial ledger transactions and balance derivation")
public class LedgerController {

    private final LedgerService ledgerService;
    private final StudentRepository studentRepository;

    public LedgerController(LedgerService ledgerService, StudentRepository studentRepository) {
        this.ledgerService = ledgerService;
        this.studentRepository = studentRepository;
    }

    @GetMapping("/my-ledger")
    @Operation(summary = "Get transaction history for the logged-in student")
    public ResponseEntity<List<LedgerTransactionResponse>> getMyLedger(@AuthenticationPrincipal UserDetails userDetails) {
        Student student = studentRepository.findByPhoneNumber(userDetails.getUsername())
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found"));

        return ResponseEntity.ok(mapTransactions(ledgerService.getStudentLedger(student.getId())));
    }

    @GetMapping("/balance")
    @Operation(summary = "Get derived current balance for logged-in student")
    public ResponseEntity<Map<String, Object>> getMyBalance(@AuthenticationPrincipal UserDetails userDetails) {
        Student student = studentRepository.findByPhoneNumber(userDetails.getUsername())
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found"));

        BigDecimal balance = ledgerService.calculateCurrentBalance(student.getId());
        return ResponseEntity.ok(Map.of(
                "studentId", student.getId(),
                "balance", balance
        ));
    }

    @GetMapping("/student/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Admin view of specific student's ledger transactions and balance")
    public ResponseEntity<Map<String, Object>> getStudentLedgerAdmin(@PathVariable Long id) {
        BigDecimal balance = ledgerService.calculateCurrentBalance(id);
        List<LedgerTransactionResponse> transactions = mapTransactions(ledgerService.getStudentLedger(id));

        return ResponseEntity.ok(Map.of(
                "balance", balance,
                "transactions", transactions
        ));
    }

    private List<LedgerTransactionResponse> mapTransactions(List<LedgerTransaction> list) {
        return list.stream().map(t -> LedgerTransactionResponse.builder()
                .id(t.getId())
                .studentId(t.getStudent().getId())
                .studentName(t.getStudent().getFullName())
                .amount(t.getAmount())
                .type(t.getType())
                .description(t.getDescription())
                .referenceId(t.getReferenceId())
                .createdBy(t.getCreatedBy())
                .createdAt(t.getCreatedAt())
                .build()).collect(Collectors.toList());
    }
}
