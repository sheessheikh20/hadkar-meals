package com.hadkarmeals.dto;

import com.hadkarmeals.entity.TransactionType;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LedgerTransactionResponse {
    private Long id;
    private Long studentId;
    private String studentName;
    private BigDecimal amount;
    private TransactionType type;
    private String description;
    private String referenceId;
    private String createdBy;
    private LocalDateTime createdAt;
}
