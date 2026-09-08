package com.hadkarmeals.service;

import com.hadkarmeals.entity.LedgerTransaction;
import com.hadkarmeals.entity.Student;
import com.hadkarmeals.entity.TransactionType;
import com.hadkarmeals.repository.LedgerTransactionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class LedgerService {

    private final LedgerTransactionRepository ledgerRepository;

    public LedgerService(LedgerTransactionRepository ledgerRepository) {
        this.ledgerRepository = ledgerRepository;
    }

    @Transactional
    public LedgerTransaction recordTransaction(
            Student student,
            BigDecimal amount,
            TransactionType type,
            String description,
            String referenceId,
            String createdBy) {

        if (amount == null || amount.compareTo(BigDecimal.ZERO) < 0) {
            amount = BigDecimal.ZERO;
        }
        amount = amount.setScale(2, RoundingMode.HALF_UP);

        LedgerTransaction transaction = LedgerTransaction.builder()
                .student(student)
                .amount(amount)
                .type(type)
                .description(description)
                .referenceId(referenceId)
                .createdBy(createdBy != null ? createdBy : "SYSTEM")
                .createdAt(LocalDateTime.now())
                .build();

        return ledgerRepository.save(transaction);
    }

    public BigDecimal calculateCurrentBalance(Long studentId) {
        List<LedgerTransaction> transactions = ledgerRepository.findByStudentIdOrderByCreatedAtAsc(studentId);
        BigDecimal balance = BigDecimal.ZERO;

        for (LedgerTransaction tx : transactions) {
            BigDecimal amt = tx.getAmount();
            TransactionType type = tx.getType();
            if (type == TransactionType.ORDER_CHARGE 
                    || type == TransactionType.EXTRA_CHARGE 
                    || type == TransactionType.PREVIOUS_BALANCE) {
                balance = balance.add(amt);
            } else if (type == TransactionType.ORDER_REVERSAL 
                    || type == TransactionType.PAYMENT 
                    || type == TransactionType.REFUND 
                    || type == TransactionType.CREDIT) {
                balance = balance.subtract(amt);
            } else {
                // ADJUSTMENT
                balance = balance.add(amt);
            }
        }
        return balance.setScale(2, RoundingMode.HALF_UP);
    }

    public List<LedgerTransaction> getStudentLedger(Long studentId) {
        return ledgerRepository.findByStudentIdOrderByCreatedAtDesc(studentId);
    }
}
