package com.hadkarmeals.repository;

import com.hadkarmeals.entity.LedgerTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDateTime;
import java.util.List;

public interface LedgerTransactionRepository extends JpaRepository<LedgerTransaction, Long> {
    List<LedgerTransaction> findByStudentIdOrderByCreatedAtDesc(Long studentId);
    List<LedgerTransaction> findByStudentIdOrderByCreatedAtAsc(Long studentId);
    List<LedgerTransaction> findByStudentIdAndCreatedAtBetweenOrderByCreatedAtAsc(
            Long studentId, LocalDateTime start, LocalDateTime end);
    List<LedgerTransaction> findByReferenceId(String referenceId);
}
